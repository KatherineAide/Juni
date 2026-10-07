"""Thin wrapper around the Claude API used by the agents.

Every call degrades gracefully: when Claude is disabled, unreachable, or declines,
the wrapper returns None and the calling agent falls back to deterministic logic.
"""

from __future__ import annotations

import logging
import os
from typing import Literal, TypeVar

import anthropic
from pydantic import BaseModel

from .config import Settings

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Server-side refusal fallback: on a policy decline the API re-runs the request on
# Anthropic's recommended fallback model for that refusal category.
FALLBACK_BETA = "server-side-fallback-2026-07-01"

Effort = Literal["low", "medium", "high"]


def credentials_configured() -> bool:
    return any(os.environ.get(k) for k in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_PROFILE"))


class Claude:
    def __init__(self, settings: Settings, client: anthropic.Anthropic | None = None):
        self.settings = settings
        self.enabled = settings.use_llm and (client is not None or credentials_configured())
        self._client = client

    @property
    def client(self) -> anthropic.Anthropic:
        if self._client is None:
            self._client = anthropic.Anthropic(timeout=120.0)
        return self._client

    def parse(self, schema: type[T], *, system: str, user: str, effort: Effort = "low", max_tokens: int = 4000) -> T | None:
        """Structured output validated against `schema`; None on any failure."""
        if not self.enabled:
            return None
        try:
            response = self.client.beta.messages.parse(
                model=self.settings.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_format=schema,
                output_config={"effort": effort},
                betas=[FALLBACK_BETA],
                fallbacks="default",
            )
        except anthropic.APIError as e:
            log.warning("Claude parse failed (%s): %s", type(e).__name__, e)
            return None
        if response.stop_reason == "refusal":
            log.info("Claude declined (%s)", getattr(response.stop_details, "category", None))
            return None
        return response.parsed_output

    def text(self, *, system: str, user: str, effort: Effort = "low", max_tokens: int = 2000) -> str | None:
        if not self.enabled:
            return None
        try:
            response = self.client.beta.messages.create(
                model=self.settings.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": effort},
                betas=[FALLBACK_BETA],
                fallbacks="default",
            )
        except anthropic.APIError as e:
            log.warning("Claude call failed (%s): %s", type(e).__name__, e)
            return None
        if response.stop_reason == "refusal":
            return None
        return "".join(b.text for b in response.content if b.type == "text").strip() or None

    def web_search(self, *, system: str, user: str, max_uses: int) -> str | None:
        """Runs Claude with the server-side web search tool and returns its notes plus source URLs.

        The returned text is web-derived and must be treated as untrusted data downstream.
        """
        if not (self.enabled and self.settings.web_search):
            return None
        messages: list = [{"role": "user", "content": user}]
        try:
            for _ in range(3):  # resume server-tool turns that pause
                response = self.client.beta.messages.create(
                    model=self.settings.model,
                    max_tokens=16000,
                    system=system,
                    messages=messages,
                    tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": max_uses}],
                    output_config={"effort": "medium"},
                    betas=[FALLBACK_BETA],
                    fallbacks="default",
                )
                if response.stop_reason != "pause_turn":
                    break
                messages.append({"role": "assistant", "content": response.content})
        except anthropic.APIError as e:
            log.warning("Web search failed (%s): %s", type(e).__name__, e)
            return None
        if response.stop_reason == "refusal":
            return None
        notes: list[str] = []
        for block in response.content:
            if block.type == "text":
                notes.append(block.text)
            elif block.type == "web_search_tool_result" and isinstance(block.content, list):
                notes.extend(f"[source] {r.title} — {r.url}" for r in block.content if getattr(r, "url", None))
        return "\n".join(notes).strip() or None
