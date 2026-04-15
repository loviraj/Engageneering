"""
Engageneering™ — Supabase client
Provides both anon and service-role clients.
- anon client: used for operations respecting RLS (user-facing)
- service client: used for ARIA agents and admin operations
"""
from functools import lru_cache
from supabase import create_client, Client
from config import get_settings


@lru_cache()
def get_supabase_anon() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key)


@lru_cache()
def get_supabase_service() -> Client:
    """Service role client — bypasses RLS. Use only in trusted server code."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)
