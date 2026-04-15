"""
Engageneering™ — Backend Configuration
All secrets loaded from environment variables / .env file
Never commit .env to Git
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Engageneering™ API"
    app_version: str = "1.0.0"
    debug: bool = False
    frontend_url: str = "https://tutbot.org"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # JWT (for custom tokens if needed)
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # OAuth — Google
    google_client_id: str
    google_client_secret: str

    # OAuth — LinkedIn
    linkedin_client_id: str
    linkedin_client_secret: str

    # Email (SMTP via Supabase or SendGrid)
    smtp_host: str = "smtp.sendgrid.net"
    smtp_port: int = 587
    smtp_user: str = "apikey"
    smtp_password: str = ""
    email_from: str = "hello@engageneering.org"
    email_from_name: str = "Engageneering™"

    # Magic link TTL
    magic_link_expire_minutes: int = 60 * 24  # 24 hours

    # Rate limiting
    rate_limit_per_minute: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
