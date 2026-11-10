from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'sqlite:///./local.db'
    jwt_secret: str = 'local-development-only-change-before-deploy-123456'
    environment: str = 'development'
    groq_api_key: str = ''
    app_origin: str = 'http://localhost:5173'
    render_external_url: str = ''
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    frontend_dist: str = '../frontend/dist'

    @property
    def allowed_origins(self):
        return {url.rstrip('/') for url in (self.app_origin, self.render_external_url) if url}


@lru_cache
def settings():
    value = Settings()
    if value.environment == 'production':
        if len(value.jwt_secret) < 32 or value.jwt_secret.startswith('local-development'):
            raise RuntimeError('Configura JWT_SECRET con un secreto aleatorio de al menos 32 caracteres.')
        if not value.database_url.startswith(('postgresql', 'postgres://')):
            raise RuntimeError('Producción requiere PostgreSQL.')
    return value
