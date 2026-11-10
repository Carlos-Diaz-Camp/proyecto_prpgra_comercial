import secrets
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User, AuthSession, Product, Review, AIService, Conversation, Message, ServiceRequest, UsageEvent, now
from .schemas import Login, UserCreate, UserUpdate, ProductInput, ReviewInput, ServiceInput, Ask
from .security import current_user, admin, report_user, authenticate, bearer, passwords, verify_password, dummy_hash, throttle, user_data, new_session, digest, aware, issue_access, set_refresh
from . import ai

app = FastAPI(title='Criterio · API de opiniones de productos', version='1.0.0', description='Tres servicios de IA con RAG, herramientas externas, historial y cuotas. Autenticación Bearer JWT. /api/reportes/uso también admite HTTP Basic únicamente para cuentas reporter.')


@app.middleware('http')
async def headers(request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'same-origin'
    if request.url.path.startswith('/api'):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/api/health', tags=['Sistema'])
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok'}


@app.post('/api/auth/login', tags=['Autenticación'])
def login(body: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    throttle(request, body.email)
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))
    valid = verify_password(body.password, user.password_hash if user else dummy_hash)
    if not user or not valid or not user.active or user.role == 'reporter':
        raise HTTPException(401, 'Correo o contraseña incorrectos.')
    return new_session(db, user, response)


@app.post('/api/auth/refresh', tags=['Autenticación'])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw, csrf = request.cookies.get('refresh_token'), request.headers.get('x-csrf-token')
    if not raw or not csrf:
        raise HTTPException(401, 'No hay una sesión para renovar.')
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') not in settings().allowed_origins:
        raise HTTPException(403, 'Origen no permitido.')
    session = db.scalar(select(AuthSession).where(AuthSession.refresh_hash == digest(raw)).with_for_update())
    if not session or session.revoked or aware(session.expires_at) <= now() or not secrets.compare_digest(session.csrf_hash, digest(csrf)):
        raise HTTPException(401, 'La sesión venció.')
    user = db.get(User, session.user_id)
    if not user or not user.active or user.role == 'reporter':
        raise HTTPException(401, 'Cuenta no disponible.')
    raw, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    session.refresh_hash, session.csrf_hash = digest(raw), digest(csrf)
    db.commit()
    set_refresh(response, session, raw, csrf)
    return {'access_token': issue_access(user, session), 'token_type': 'bearer', 'user': user_data(user)}


@app.post('/api/auth/logout', tags=['Autenticación'])
def logout(response: Response, credentials=Depends(bearer), db: Session = Depends(get_db)):
    _, session = authenticate(credentials, db)
    session.revoked = True
    db.commit()
    response.delete_cookie('refresh_token', path='/api/auth')
    response.delete_cookie('csrf_token', path='/')
    return {'message': 'Sesión cerrada.'}


@app.get('/api/auth/me', tags=['Autenticación'])
def me(user: User = Depends(current_user)):
    return user_data(user)


@app.get('/api/servicios', tags=['Catálogo'])
def services(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {'items': list(db.scalars(select(AIService).order_by(AIService.id))), 'ai_configured': bool(settings().groq_api_key)}


@app.get('/api/productos', tags=['Catálogo'])
def products(q: str = Query('', max_length=200), user: User = Depends(current_user), db: Session = Depends(get_db)):
    statement = select(Product).order_by(Product.id)
    if q:
        statement = statement.where(Product.name.ilike(f'%{q}%'))
    return list(db.scalars(statement.limit(500)))


@app.get('/api/productos/{product_id}/resenas', tags=['Catálogo'])
def reviews(product_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Review).where(Review.product_id == product_id).order_by(Review.id)))


@app.post('/api/ia/{service_slug}', tags=['IA'])
def ask(service_slug: str, body: Ask, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == 'reporter':
        raise HTTPException(403, 'La cuenta de reportes es de solo lectura.')
    service = db.scalar(select(AIService).where(AIService.slug == service_slug))
    if not service or not service.enabled:
        raise HTTPException(403, 'El servicio está desactivado o no existe.')
    if body.product_id and not db.get(Product, body.product_id):
        raise HTTPException(404, 'Producto no encontrado.')
    history = []
    if body.conversation_id:
        conversation = db.get(Conversation, body.conversation_id)
        if not conversation or conversation.user_id != user.id or conversation.service_id != service.id:
            raise HTTPException(404, 'Conversación no encontrada.')
        old = list(db.scalars(select(Message).where(Message.conversation_id == conversation.id, Message.role.in_(['user', 'assistant'])).order_by(Message.created_at.desc()).limit(6)))
        history = [{'role': m.role, 'content': m.content[:2000]} for m in reversed(old)]
    else:
        conversation = Conversation(user_id=user.id, service_id=service.id, title=body.question[:100])
        db.add(conversation)
        db.flush()
    request_record = ServiceRequest(user_id=user.id, service_id=service.id, conversation_id=conversation.id)
    db.add_all([request_record, Message(conversation_id=conversation.id, role='user', content=body.question)])
    db.commit()
    # Close read transaction before quota transactions run on their own connections.
    request_id, conversation_id = request_record.id, conversation.id
    db.commit()
    try:
        db.refresh(user)
        if user.tokens_used + user.tokens_reserved >= user.token_limit:
            raise HTTPException(429, 'Alcanzaste tu límite de tokens. Solicita más cupo al administrador.')
        db.commit()
        answer, sources, trace = ai.run_ai(db, user.id, request_id, service, body.question, body.product_id, history)
        request_record.status, request_record.trace = 'completed', trace
        message = Message(conversation_id=conversation_id, role='assistant', content=answer, sources=sources)
        db.add(message)
        db.commit()
        usage = db.execute(select(func.coalesce(func.sum(UsageEvent.input_tokens), 0), func.coalesce(func.sum(UsageEvent.output_tokens), 0)).where(UsageEvent.request_id == request_id)).one()
        return {'conversation_id': conversation_id, 'request_id': request_id, 'answer': answer, 'sources': sources, 'trace': trace, 'usage': {'input_tokens': usage[0], 'output_tokens': usage[1], 'total_tokens': sum(usage)}}
    except HTTPException as exc:
        request_record.status = 'blocked' if exc.status_code == 429 else 'failed'
        request_record.error = str(exc.detail)
        db.add(Message(conversation_id=conversation_id, role='error', content=str(exc.detail)))
        db.commit()
        raise HTTPException(exc.status_code, {'message': exc.detail, 'conversation_id': conversation_id, 'request_id': request_id}, headers=exc.headers)
    except Exception:
        db.rollback()
        request_record = db.get(ServiceRequest, request_id)
        request_record.status, request_record.error = 'failed', 'Error inesperado en el procesamiento.'
        db.commit()
        raise HTTPException(502, 'No se pudo procesar la respuesta. La consulta quedó registrada.')


@app.get('/api/conversaciones', tags=['Historial'])
def conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    stmt = select(Conversation).order_by(Conversation.created_at.desc()).limit(200)
    if user.role != 'admin':
        stmt = stmt.where(Conversation.user_id == user.id)
    return list(db.scalars(stmt))


@app.get('/api/conversaciones/{conversation_id}', tags=['Historial'])
def conversation_detail(conversation_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(Conversation, conversation_id)
    if not item or (item.user_id != user.id and user.role != 'admin'):
        raise HTTPException(404, 'Conversación no encontrada.')
    return {'conversation': item, 'messages': list(db.scalars(select(Message).where(Message.conversation_id == item.id).order_by(Message.created_at, Message.id))), 'requests': list(db.scalars(select(ServiceRequest).where(ServiceRequest.conversation_id == item.id).order_by(ServiceRequest.created_at)))}


@app.get('/api/consumo', tags=['Consumo'])
def consumption(user: User = Depends(current_user)):
    return {**user_data(user), 'available': max(0, user.token_limit - user.tokens_used - user.tokens_reserved)}


@app.get('/api/reportes/uso', tags=['Reportes'])
def report(desde: date | None = None, hasta: date | None = None, servicio: str | None = None, usuario: str | None = None, user: User = Depends(report_user), db: Session = Depends(get_db)):
    zone = ZoneInfo('America/Guatemala')
    today = now().astimezone(zone).date()
    start, end = desde or (today - timedelta(days=30)), hasta or today
    if end < start or (end - start).days > 366:
        raise HTTPException(422, 'El rango debe ser válido y no superar 366 días.')
    begin = datetime.combine(start, datetime.min.time(), zone)
    finish = datetime.combine(end + timedelta(days=1), datetime.min.time(), zone)
    stmt = select(ServiceRequest, AIService, User).join(AIService, ServiceRequest.service_id == AIService.id).join(User, ServiceRequest.user_id == User.id).where(ServiceRequest.created_at >= begin, ServiceRequest.created_at < finish)
    if user.role not in ('admin', 'reporter'):
        if usuario and usuario != user.id:
            raise HTTPException(403, 'Solo puedes consultar tu propio consumo.')
        stmt = stmt.where(ServiceRequest.user_id == user.id)
    elif usuario:
        stmt = stmt.where(ServiceRequest.user_id == usuario)
    if servicio:
        stmt = stmt.where(AIService.slug == servicio)
    entries = db.execute(stmt).all()
    ids = [r.id for r, _, _ in entries]
    usage = defaultdict(lambda: [0, 0, 0])
    if ids:
        for item in db.scalars(select(UsageEvent).where(UsageEvent.request_id.in_(ids))):
            usage[item.request_id][0] += item.input_tokens
            usage[item.request_id][1] += item.output_tokens
            usage[item.request_id][2] += item.reserved_tokens
    rows = {}
    for r, service, owner in entries:
        day = aware(r.created_at).astimezone(zone).date().isoformat()
        key = (day, service.slug, owner.id)
        row = rows.setdefault(key, {'fecha': day, 'servicio': service.slug, 'usuario_id': owner.id, 'usuario': owner.name, 'consultas': 0, 'completadas': 0, 'fallidas': 0, 'bloqueadas': 0, 'pendientes': 0, 'tokens_entrada': 0, 'tokens_salida': 0, 'tokens_total': 0, 'tokens_reservados': 0})
        row['consultas'] += 1
        row[{'completed': 'completadas', 'failed': 'fallidas', 'blocked': 'bloqueadas'}.get(r.status, 'pendientes')] += 1
        row['tokens_entrada'] += usage[r.id][0]
        row['tokens_salida'] += usage[r.id][1]
        row['tokens_total'] += sum(usage[r.id][:2])
        row['tokens_reservados'] += usage[r.id][2]
    values = sorted(rows.values(), key=lambda r: (r['fecha'], r['servicio'], r['usuario']))
    metrics = ('consultas', 'completadas', 'fallidas', 'bloqueadas', 'pendientes', 'tokens_entrada', 'tokens_salida', 'tokens_total', 'tokens_reservados')
    return {'rows': values, 'totals': {m: sum(r[m] for r in values) for m in metrics}, 'filters': {'desde': start, 'hasta': end, 'servicio': servicio, 'timezone': 'America/Guatemala'}, 'generated_at': now()}


RESOURCES = {'usuarios': User, 'productos': Product, 'resenas': Review, 'servicios': AIService}


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'El registro está duplicado o tiene datos relacionados. Usa desactivar cuando quieras conservar el historial.')


def resource(name):
    if name not in RESOURCES:
        raise HTTPException(404, 'Recurso no encontrado.')
    return RESOURCES[name]


def find(db, model, key):
    try:
        item = db.get(model, key if model is User else int(key))
    except ValueError:
        item = None
    if not item:
        raise HTTPException(404, 'Registro no encontrado.')
    return item


@app.get('/api/admin/{name}', tags=['Administración'])
def admin_list(name: str, user: User = Depends(admin), db: Session = Depends(get_db)):
    model = resource(name)
    values = list(db.scalars(select(model).order_by(model.id).limit(2000)))
    return [user_data(v) for v in values] if model is User else values


def validate_resource(name, data, updating=False):
    from pydantic import ValidationError
    schemas = {'usuarios': UserUpdate if updating else UserCreate, 'productos': ProductInput, 'resenas': ReviewInput, 'servicios': ServiceInput}
    resource(name)
    try:
        result = schemas[name].model_validate(data).model_dump()
    except ValidationError as exc:
        raise HTTPException(422, str(exc))
    if name == 'usuarios':
        password = result.pop('password', None)
        result['email'] = result['email'].lower().strip()
        if password:
            result['password_hash'] = passwords.hash(password)
    return result


@app.post('/api/admin/{name}', tags=['Administración'], status_code=201)
def admin_create(name: str, body: dict, user: User = Depends(admin), db: Session = Depends(get_db)):
    model = resource(name)
    item = model(**validate_resource(name, body))
    db.add(item)
    commit(db)
    return user_data(item) if model is User else item


@app.put('/api/admin/{name}/{key}', tags=['Administración'])
def admin_update(name: str, key: str, body: dict, user: User = Depends(admin), db: Session = Depends(get_db)):
    model = resource(name)
    item = find(db, model, key)
    data = validate_resource(name, body, True)
    if model is User and item.id == user.id and (data['role'] != 'admin' or not data['active']):
        raise HTTPException(409, 'No puedes quitar tu propio acceso administrativo.')
    if model is AIService and item.slug != data['slug']:
        raise HTTPException(409, 'El identificador del servicio no puede cambiar; su historial depende de él.')
    for field, value in data.items():
        setattr(item, field, value)
    if model is User and ('password_hash' in data or not data['active'] or data['role'] == 'reporter'):
        for session in db.scalars(select(AuthSession).where(AuthSession.user_id == item.id)):
            session.revoked = True
    commit(db)
    return user_data(item) if model is User else item


@app.delete('/api/admin/{name}/{key}', tags=['Administración'])
def admin_delete(name: str, key: str, user: User = Depends(admin), db: Session = Depends(get_db)):
    model = resource(name)
    item = find(db, model, key)
    if model is User and item.id == user.id:
        raise HTTPException(409, 'No puedes eliminar tu cuenta activa.')
    db.delete(item)
    commit(db)
    return {'message': 'Registro eliminado.'}


@app.get('/api/admin-consumo/pendientes', tags=['Administración'])
def pending_usage(user: User = Depends(admin), db: Session = Depends(get_db)):
    return list(db.scalars(select(UsageEvent).where(UsageEvent.status == 'unconfirmed')))


@app.post('/api/admin-consumo/{event_id}/conciliar', tags=['Administración'])
def reconcile(event_id: str, input_tokens: int = Query(ge=0, le=1000000), output_tokens: int = Query(ge=0, le=1000000), user: User = Depends(admin), db: Session = Depends(get_db)):
    event = db.scalar(select(UsageEvent).where(UsageEvent.id == event_id).with_for_update())
    if not event or event.status != 'unconfirmed':
        raise HTTPException(409, 'El evento no requiere conciliación.')
    record = db.get(ServiceRequest, event.request_id)
    owner = db.scalar(select(User).where(User.id == record.user_id).with_for_update())
    owner.tokens_reserved -= event.reserved_tokens
    owner.tokens_used += input_tokens + output_tokens
    event.input_tokens, event.output_tokens, event.reserved_tokens, event.status = input_tokens, output_tokens, 0, 'reconciled'
    db.commit()
    return {'message': 'Consumo conciliado.'}


dist = Path(settings().frontend_dist).resolve()
if dist.is_dir():
    app.mount('/assets', StaticFiles(directory=dist / 'assets'), name='assets')

    @app.get('/{path:path}', include_in_schema=False)
    def frontend(path: str):
        if path.startswith(('api/', 'docs', 'openapi', 'redoc')):
            raise HTTPException(404, 'Ruta no encontrada.')
        return FileResponse(dist / 'index.html')
