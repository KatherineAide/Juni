from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from juni.api import create_app
from juni.catalog import Catalog
from juni.config import Settings
from juni.db import init_db, make_engine
from juni.llm import Claude


@pytest.fixture
def settings(tmp_path) -> Settings:
    # Set JUNI_TEST_DATABASE_URL (e.g. postgresql+psycopg://juni@localhost/juni_test) to run against Postgres.
    url = os.environ.get("JUNI_TEST_DATABASE_URL") or f"sqlite:///{tmp_path}/juni.db"
    return Settings(database_url=url, use_llm=False, web_search=False)


@pytest.fixture
def catalog(settings) -> Catalog:
    return Catalog.load(init_db(make_engine(settings.database_url)))


@pytest.fixture
def offline_claude(settings) -> Claude:
    return Claude(settings)


@pytest.fixture
def client(settings, offline_claude):
    with TestClient(create_app(settings, offline_claude)) as c:
        yield c


DEMO_PROFILE = {
    "name": "Alex",
    "lang": "en",
    "homeCity": "Chicago",
    "passport": "US",
    "budgetMin": 1500,
    "budgetMax": 3000,
    "interests": ["languages", "cooking"],
    "skills": [{"label": "Spanish", "level": "A2"}, {"label": "Home cooking", "level": "Intermediate"}],
    "housing": ["homestay"],
    "accessibility": [],
    "dietary": ["Vegetarian-friendly"],
}
