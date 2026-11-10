from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings


class Base(DeclarativeBase):
    pass


def normalize_url(url):
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql+psycopg://', 1)
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg://', 1)
    return url


url = normalize_url(settings().database_url)
engine = create_engine(url, pool_pre_ping=True, **({'connect_args': {'check_same_thread': False}} if url.startswith('sqlite') else {'pool_size': 5, 'max_overflow': 5}))
if url.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def enable_fk(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
