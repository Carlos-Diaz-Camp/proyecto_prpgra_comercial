import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, HTTPBasic
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User, AuthSession, now

passwords = PasswordHash.recommended()
dummy_hash = passwords.hash('invalid-user-timing-placeholder')
bearer = HTTPBearer(auto_error=False)
basic = HTTPBasic(auto_error=False)
attempts = defaultdict(deque)
attempt_lock = threading.Lock()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def throttle(request: Request, email: str):
    key = (request.client.host if request.client else 'unknown', email.lower())
    with attempt_lock:
        cutoff = time.monotonic() - 60
        if len(attempts) > 10000:
            attempts.clear()
        queue = attempts[key]
        while queue and queue[0] < cutoff:
            queue.popleft()
        if len(queue) >= 10:
            raise HTTPException(429, 'Demasiados intentos. Espera un minuto.')
        queue.append(time.monotonic())


def verify_password(raw, hashed):
    try:
        return passwords.verify(raw, hashed)
    except Exception:
        return False


def user_data(user):
    return {key: getattr(user, key) for key in ('id', 'name', 'email', 'role', 'active', 'token_limit', 'tokens_used', 'tokens_reserved')}


def issue_access(user, session):
    return jwt.encode({'sub': user.id, 'sid': session.id, 'typ': 'access', 'iss': 'criterio', 'aud': 'criterio-api', 'iat': now(), 'exp': now() + timedelta(minutes=settings().access_token_minutes)}, settings().jwt_secret, algorithm='HS256')


def set_refresh(response: Response, session, raw, csrf):
    secure = settings().environment == 'production'
    options = dict(secure=secure, samesite='lax', max_age=settings().refresh_token_days * 86400)
    response.set_cookie('refresh_token', raw, httponly=True, path='/api/auth', **options)
    response.set_cookie('csrf_token', csrf, httponly=False, path='/', **options)


def new_session(db, user, response):
    raw, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    session = AuthSession(user_id=user.id, refresh_hash=digest(raw), csrf_hash=digest(csrf), expires_at=now() + timedelta(days=settings().refresh_token_days))
    db.add(session)
    db.commit()
    set_refresh(response, session, raw, csrf)
    return {'access_token': issue_access(user, session), 'token_type': 'bearer', 'user': user_data(user)}


def authenticate(credentials, db):
    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(401, 'Inicia sesión.', headers={'WWW-Authenticate': 'Bearer'})
    try:
        payload = jwt.decode(credentials.credentials, settings().jwt_secret, algorithms=['HS256'], audience='criterio-api', issuer='criterio', options={'require': ['exp', 'sub', 'sid', 'typ']})
        if payload['typ'] != 'access':
            raise jwt.InvalidTokenError()
        session = db.get(AuthSession, payload['sid'])
        user = db.get(User, payload['sub'])
        if not session or session.revoked or aware(session.expires_at) <= now() or session.user_id != payload['sub'] or not user or not user.active:
            raise jwt.InvalidTokenError()
        return user, session
    except jwt.PyJWTError:
        raise HTTPException(401, 'La sesión venció. Vuelve a iniciar sesión.', headers={'WWW-Authenticate': 'Bearer'})


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    return authenticate(credentials, db)[0]


def admin(user: User = Depends(current_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Esta acción requiere un administrador.')
    return user


def report_user(request: Request, db: Session = Depends(get_db)):
    header = request.headers.get('authorization', '')
    if header.lower().startswith('bearer '):
        return authenticate(HTTPAuthorizationCredentials(scheme='Bearer', credentials=header[7:]), db)[0]
    if header.lower().startswith('basic '):
        import base64
        try:
            email, password = base64.b64decode(header[6:], validate=True).decode().split(':', 1)
        except Exception:
            raise HTTPException(401, 'Credenciales inválidas.', headers={'WWW-Authenticate': 'Basic realm="reportes"'})
        user = db.scalar(select(User).where(User.email == email.lower().strip()))
        valid = verify_password(password, user.password_hash if user else dummy_hash)
        if user and user.active and user.role == 'reporter' and valid:
            return user
        throttle(request, email)
    raise HTTPException(401, 'Usa JWT o la cuenta de solo lectura de Power BI.', headers={'WWW-Authenticate': 'Basic realm="reportes"'})
