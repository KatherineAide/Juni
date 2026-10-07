"""ASGI entry point: `uvicorn juni.main:app --reload`."""

import logging

from .api import create_app

logging.basicConfig(level=logging.INFO)
app = create_app()
