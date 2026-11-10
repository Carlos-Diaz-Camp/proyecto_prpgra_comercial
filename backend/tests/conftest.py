import os
import sys
from pathlib import Path
import json
import pytest
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'backend'))
(root / 'tmp').mkdir(exist_ok=True)
test_url = os.environ.get('TEST_DATABASE_URL', 'sqlite:///' + (root / 'tmp' / 'criterio_test.db').as_posix())
if not (test_url.endswith('/criterio_test') or test_url.endswith('/criterio_test.db')):
    raise RuntimeError('Las pruebas solo pueden usar una base llamada criterio_test.')
os.environ['DATABASE_URL'] = test_url
os.environ['ENVIRONMENT'] = 'development'
os.environ['GROQ_API_KEY'] = 'test-key-not-real'
os.environ['JWT_SECRET'] = 'test-only-secret-longer-than-thirty-two-characters'
from fastapi.testclient import TestClient
from app.db import Base, engine, SessionLocal
from app.models import User, Product, Review, AIService
from app.main import app
from app.security import passwords, attempts


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    if engine.dialect.name == 'postgresql':
        with engine.connect() as connection:
            connection.connection.driver_connection.execute((root / 'database/setup.sql').read_text(encoding='utf-8'))
            connection.commit()
    else:
        Base.metadata.create_all(engine)
        data = json.loads((root / 'database/demo.json').read_text(encoding='utf-8'))
        with SessionLocal() as db:
            for model, key in [(Product, 'products'), (Review, 'reviews'), (AIService, 'ai_services')]:
                for row in data[key]: db.add(model(**row))
                db.flush()
            db.commit()
    with SessionLocal() as db:
        for name, role in [('admin', 'admin'), ('user', 'user'), ('other', 'user'), ('reporter', 'reporter')]:
            db.add(User(id=name, email=f'{name}@test.local', name=name, role=role, password_hash=passwords.hash('Test-password-123'), token_limit=1000000))
        db.commit()
    attempts.clear()
    yield


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def login(client, role='user'):
    response = client.post('/api/auth/login', json={'email': f'{role}@test.local', 'password': 'Test-password-123'})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}
