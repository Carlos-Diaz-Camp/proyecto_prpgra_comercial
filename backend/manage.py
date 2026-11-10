"""Bootstrap local data or create an account without committing credentials."""
import argparse
import getpass
import json
from pathlib import Path
from sqlalchemy import select
from app.db import Base, engine, SessionLocal
from app.models import User, Product, Review, AIService
from app.security import passwords

parser = argparse.ArgumentParser(description='Administración inicial de Criterio')
parser.add_argument('command', choices=['init-local', 'init-postgres', 'create-user', 'seed'])
parser.add_argument('--email')
parser.add_argument('--name', default='Administrador')
parser.add_argument('--role', choices=['admin', 'user', 'reporter'], default='admin')
args = parser.parse_args()
data_file = Path(__file__).resolve().parents[1] / 'database' / 'demo.json'

if args.command == 'init-postgres':
    if engine.dialect.name != 'postgresql':
        raise SystemExit('Configura DATABASE_URL con la conexión PostgreSQL.')
    from sqlalchemy import inspect
    if inspect(engine).has_table('users'):
        raise SystemExit('La base ya está inicializada. No se ha modificado nada.')
    with engine.connect() as connection:
        connection.connection.driver_connection.execute((data_file.parent / 'setup.sql').read_text(encoding='utf-8'))
        connection.commit()
    print('PostgreSQL inicializado desde database/setup.sql.')

if args.command == 'init-local':
    if engine.dialect.name != 'sqlite':
        raise SystemExit('Para PostgreSQL ejecuta database/setup.sql; init-local es solo para SQLite de desarrollo.')
    Base.metadata.create_all(engine)

if args.command in ('init-local', 'seed'):
    data = json.loads(data_file.read_text(encoding='utf-8'))
    with SessionLocal() as db:
        for model, key in [(Product, 'products'), (Review, 'reviews'), (AIService, 'ai_services')]:
            for row in data[key]:
                if not db.get(model, row['id']):
                    db.add(model(**row))
            db.flush()
        db.commit()
    print('Datos de demostración cargados.')

if args.command == 'create-user':
    email = (args.email or input('Correo: ')).strip().lower()
    password = getpass.getpass('Contraseña (mínimo 10 caracteres): ')
    if len(password) < 10 or '@' not in email:
        raise SystemExit('Correo o contraseña no válidos.')
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            raise SystemExit('Ese usuario ya existe.')
        db.add(User(name=args.name, email=email, role=args.role, password_hash=passwords.hash(password)))
        db.commit()
    print('Usuario creado.')
