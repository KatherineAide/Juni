"""Locale formatting matching the front-end's Intl output (en-US / es-ES)."""

from __future__ import annotations

from datetime import date as _date

MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "es": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
}
SHORT = {
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "es": ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
}


def money(amount: int | float, lang: str) -> str:
    n = round(amount)
    if lang == "es":
        # es-ES only groups numbers with five or more digits.
        body = f"{n:,}".replace(",", ".") if abs(n) >= 10000 else str(n)
        return f"{body} US$"
    return f"${n:,}"


def month_name(m: int, lang: str) -> str:
    return MONTHS[lang][m]


def date(iso: str, lang: str) -> str:
    d = _date.fromisoformat(iso[:10])
    if lang == "es":
        return f"{d.day} {SHORT['es'][d.month - 1]} {d.year}"
    return f"{SHORT['en'][d.month - 1]} {d.day}, {d.year}"


def month_of(iso: str) -> int:
    return int(iso[5:7]) - 1
