from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="JUNI_", env_file=".env", extra="ignore")

    # postgresql+psycopg://user:pass@host/db in production; SQLite for local dev and tests.
    database_url: str = "sqlite:///./juni.db"
    model: str = "claude-opus-5-5"
    # When false (or no Anthropic credentials are configured) agents use deterministic
    # rule-based fallbacks, so the app and tests run offline.
    use_llm: bool = True
    # Scout may search the web for programs not in Juni's database.
    web_search: bool = True
    web_search_max_uses: int = 3
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
