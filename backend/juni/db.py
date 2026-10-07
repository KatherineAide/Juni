"""Persistence: catalog tables, chat sessions and messages.

Catalog rows keep the full record as JSON next to the columns we query on, which
keeps the schema portable between PostgreSQL (production) and SQLite (dev/tests).
The full relational target schema lives in db/schema.sql.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, create_engine, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

SEED_PATH = Path(__file__).parent / "data" / "seed.json"


class Base(DeclarativeBase):
    pass


class DestinationRow(Base):
    __tablename__ = "destination"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2))
    data: Mapped[dict] = mapped_column(JSON)


class SchoolRow(Base):
    __tablename__ = "school"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    destination_id: Mapped[str] = mapped_column(ForeignKey("destination.id"))
    verification_status: Mapped[str] = mapped_column(String(16))
    data: Mapped[dict] = mapped_column(JSON)


class ProgramRow(Base):
    __tablename__ = "program"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    school_id: Mapped[str] = mapped_column(ForeignKey("school.id"))
    destination_id: Mapped[str] = mapped_column(ForeignKey("destination.id"))
    category: Mapped[str] = mapped_column(String(32), index=True)
    data: Mapped[dict] = mapped_column(JSON)


class ReviewRow(Base):
    __tablename__ = "review"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    program_id: Mapped[str] = mapped_column(ForeignKey("program.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)


class ReferenceRow(Base):
    """Small reference datasets (categories, passports, visa rules)."""

    __tablename__ = "reference"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[dict | list] = mapped_column(JSON)


class ChatSessionRow(Base):
    __tablename__ = "chat_session"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    shared_state: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class AgentMessageRow(Base):
    __tablename__ = "agent_message"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_session.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    parts: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


def make_engine(url: str) -> Engine:
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    return create_engine(url, **kwargs)


def init_db(engine: Engine) -> sessionmaker[Session]:
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as s:
        if not s.scalar(select(func.count()).select_from(ProgramRow)):
            seed(s)
            s.commit()
    return factory


def seed(s: Session, path: Path = SEED_PATH) -> None:
    data = json.loads(path.read_text())
    for d in data["destinations"]:
        s.add(DestinationRow(id=d["id"], country_code=d["countryCode"], data=d))
    s.flush()
    for sc in data["schools"]:
        s.add(SchoolRow(id=sc["id"], destination_id=sc["destinationId"], verification_status=sc["verification"]["status"], data=sc))
    s.flush()
    for p in data["programs"]:
        s.add(ProgramRow(id=p["id"], school_id=p["schoolId"], destination_id=p["destinationId"], category=p["category"], data=p))
    s.flush()
    for r in data["reviews"]:
        s.add(ReviewRow(id=r["id"], program_id=r["programId"], data=r))
    for key in ("categories", "passports", "visaRules", "visaLastChecked", "today"):
        s.add(ReferenceRow(key=key, data=data[key]))
