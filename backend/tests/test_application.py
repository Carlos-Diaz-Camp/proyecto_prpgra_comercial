import base64
import json
from concurrent.futures import ThreadPoolExecutor
import httpx
import pytest
from sqlalchemy import select, func
from app import ai
from app.db import SessionLocal, engine
from app.models import User, AuthSession, AIService, Message, ServiceRequest, UsageEvent
from conftest import login


def completion(content='Respuesta basada en [reseña:1].', calls=None):
    return {'choices': [{'message': {'role': 'assistant', 'content': content, **({'tool_calls': calls} if calls else {})}}], 'usage': {'prompt_tokens': 100, 'completion_tokens': 20, 'total_tokens': 120}}


def tool(name, args, id='call-1'):
    return {'id': id, 'type': 'function', 'function': {'name': name, 'arguments': json.dumps(args)}}


def test_login_refresh_rotation_logout_and_roles(client):
    auth = login(client)
    assert client.get('/api/admin/usuarios', headers=auth).status_code == 403
    raw = client.cookies.get('refresh_token')
    csrf = client.cookies.get('csrf_token')
    assert client.post('/api/auth/refresh').status_code == 401
    result = client.post('/api/auth/refresh', headers={'x-csrf-token': csrf})
    assert result.status_code == 200
    assert client.cookies.get('refresh_token') != raw
    assert client.post('/api/auth/logout', headers=auth).status_code == 200
    assert client.get('/api/auth/me', headers=auth).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'user@test.local', 'password': 'incorrect'}).status_code == 401


def test_rag_memory_history_tokens_and_report(client, monkeypatch):
    observed = []
    def fake(messages, *args, **kwargs):
        observed.append(messages)
        return completion()
    monkeypatch.setattr(ai, 'groq_call', fake)
    auth = login(client)
    result = client.post('/api/ia/chat', headers=auth, json={'question': '¿Qué dicen de la batería?', 'product_id': 1})
    assert result.status_code == 200, result.text
    data = result.json()
    assert data['usage']['total_tokens'] == 120
    assert any(s['id'] == 'reseña:1' for s in data['sources'])
    second = client.post('/api/ia/chat', headers=auth, json={'question': '¿Y su cámara?', 'product_id': 1, 'conversation_id': data['conversation_id']})
    assert second.status_code == 200
    assert any(m['content'] == '¿Qué dicen de la batería?' for m in observed[1])
    detail = client.get('/api/conversaciones/' + data['conversation_id'], headers=auth).json()
    assert len(detail['messages']) == 4
    assert client.get('/api/consumo', headers=auth).json()['tokens_used'] == 240
    report = client.get('/api/reportes/uso', headers=auth).json()
    assert report['totals']['tokens_total'] == 240
    assert report['totals']['consultas'] == 2
    assert sum(r['tokens_total'] for r in report['rows']) == 240


def test_no_evidence_does_not_invent_or_call_provider(client, monkeypatch):
    monkeypatch.setattr(ai, 'groq_call', lambda *a, **k: pytest.fail('Must not invoke provider'))
    auth = login(client)
    result = client.post('/api/ia/chat', headers=auth, json={'question': 'zxqxyzrobotmodelo'})
    assert result.status_code == 200
    assert 'información suficiente' in result.json()['answer']
    assert result.json()['usage']['total_tokens'] == 0


def test_groq_retries_once_after_short_rate_limit(monkeypatch):
    responses = iter([
        httpx.Response(429, headers={'Retry-After': '2'}),
        httpx.Response(200, json=completion()),
    ])
    provider = httpx.Client(transport=httpx.MockTransport(lambda _: next(responses)))
    delays = []
    monkeypatch.setattr(ai.httpx, 'Client', lambda **_: provider)
    monkeypatch.setattr(ai.time, 'sleep', delays.append)

    result = ai.groq_call([{'role': 'user', 'content': 'Hola'}], 'openai/gpt-oss-20b', 100)

    assert delays == [2.2]
    assert result['usage']['total_tokens'] == 120


@pytest.mark.parametrize(('slug', 'empty_search'), [('explorar', False), ('alternativas', False), ('explorar', True)])
def test_agents_use_external_tools_multiple_steps_and_meter_all_calls(client, monkeypatch, slug, empty_search):
    responses = iter([completion(None, [tool('buscar_externos', {'consulta': 'phone'})]), completion(None, [tool('detalle_externo', {'producto_id': 1}, 'call-2')]), completion('Opiniones de ejemplo [externo:1].')])
    monkeypatch.setattr(ai, 'groq_call', lambda *a, **k: next(responses))
    seen = []
    def external(path, params=None):
        seen.append(path)
        if path == '/search' and empty_search:
            return {'products': []}, []
        return {'products': [{'id': 1, 'reviews': [{'comment': 'Good', 'rating': 4}]}]}, [{'id': 'externo:1', 'title': 'Demo', 'url': 'https://dummyjson.com/products/1', 'demo': True}]
    monkeypatch.setattr(ai, 'external', external)
    auth = login(client)
    result = client.post('/api/ia/' + slug, headers=auth, json={'question': 'Busca opiniones y alternativas', 'product_id': 1})
    assert result.status_code == 200, result.text
    expected_search = ['/search', '/category/smartphones'] if empty_search else ['/search']
    assert seen == expected_search + ['/1']
    assert len(result.json()['trace']) == 2
    assert any(source['id'] == 'externo:1' for source in result.json()['sources'])
    assert result.json()['usage']['total_tokens'] == 360


def test_quota_block_no_call_and_user_history_isolation(client, monkeypatch):
    monkeypatch.setattr(ai, 'groq_call', lambda *a, **k: pytest.fail('Quota must block provider'))
    with SessionLocal() as db:
        db.get(User, 'user').token_limit = 0
        db.commit()
    auth = login(client)
    result = client.post('/api/ia/chat', headers=auth, json={'question': 'Hola consulta', 'product_id': 1})
    assert result.status_code == 429
    conversation_id = result.json()['detail']['conversation_id']
    other = login(client, 'other')
    assert client.get('/api/conversaciones/' + conversation_id, headers=other).status_code == 404
    assert client.get('/api/reportes/uso?usuario=admin', headers=auth).status_code == 403
    assert client.get('/api/reportes/uso', headers=auth).json()['totals']['bloqueadas'] == 1


def test_admin_crud_validation_disable_and_foreign_keys(client, monkeypatch):
    auth = login(client, 'admin')
    body = {'name': 'Producto nuevo', 'brand': 'Demo', 'category': 'tablets', 'description': 'Descripción completa', 'price': 10, 'currency': 'USD', 'is_demo': True}
    product = client.post('/api/admin/productos', headers=auth, json=body)
    assert product.status_code == 201, product.text
    id = product.json()['id']
    assert id > 12
    assert client.put(f'/api/admin/productos/{id}', headers=auth, json={**body, 'price': 20}).json()['price'] == 20
    assert client.delete(f'/api/admin/productos/{id}', headers=auth).status_code == 200
    assert client.post('/api/admin/resenas', headers=auth, json={'product_id': 99999, 'rating': 3, 'comment': 'Comentario de prueba'}).status_code == 409
    service = client.get('/api/admin/servicios', headers=auth).json()[0]
    payload = {k: v for k, v in service.items() if k != 'id'}
    payload['enabled'] = False
    assert client.put(f'/api/admin/servicios/{service["id"]}', headers=auth, json=payload).status_code == 200
    assert client.post('/api/ia/' + service['slug'], headers=auth, json={'question': 'Hola consulta', 'product_id': 1}).status_code == 403


def test_powerbi_basic_and_jwt_match_and_read_only(client):
    auth = login(client, 'admin')
    token = base64.b64encode(b'reporter@test.local:Test-password-123').decode()
    basic = {'Authorization': 'Basic ' + token}
    expected = client.get('/api/reportes/uso', headers=auth).json()
    actual = client.get('/api/reportes/uso', headers=basic).json()
    assert actual['totals'] == expected['totals']
    assert actual['rows'] == expected['rows']
    assert client.get('/api/admin/usuarios', headers=basic).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'reporter@test.local', 'password': 'Test-password-123'}).status_code == 401


def test_unknown_provider_failure_preserves_reservation_and_reconciliation(client, monkeypatch):
    def fail(*a, **k): raise httpx.ReadTimeout('timeout')
    monkeypatch.setattr(ai, 'groq_call', fail)
    auth = login(client)
    assert client.post('/api/ia/chat', headers=auth, json={'question': 'Consulta de prueba', 'product_id': 1}).status_code == 503
    assert client.get('/api/consumo', headers=auth).json()['tokens_reserved'] > 0
    auth = login(client, 'admin')
    event = client.get('/api/admin-consumo/pendientes', headers=auth).json()[0]
    assert client.post(f'/api/admin-consumo/{event["id"]}/conciliar?input_tokens=40&output_tokens=10', headers=auth).status_code == 200
    with SessionLocal() as db:
        user = db.get(User, 'user')
        assert user.tokens_reserved == 0 and user.tokens_used == 50


@pytest.mark.skipif(engine.dialect.name != 'postgresql', reason='Row locking must be verified on PostgreSQL')
def test_simultaneous_requests_cannot_overspend(monkeypatch):
    import time
    def fake(*args, **kwargs): time.sleep(.15); return completion()
    monkeypatch.setattr(ai, 'groq_call', fake)
    with SessionLocal() as db:
        user = db.get(User, 'user'); user.token_limit = 3000
        service = db.get(AIService, 1)
        records = [ServiceRequest(user_id='user', service_id=1) for _ in range(2)]
        db.add_all(records); db.commit(); ids = [r.id for r in records]
    def call(id):
        try: ai.metered_call('user', id, service, [{'role': 'user', 'content': 'Hola'}]); return 200
        except Exception as exc: return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(call, ids))
    assert sorted(results) == [200, 429]
