"""Application: drafts inquiry emails after the user approves. Never sends anything."""

from __future__ import annotations

import uuid

from pydantic import BaseModel

from ..catalog import Catalog
from ..fmt import date, month_of
from ..llm import Claude
from ..models import ActionProposal, DraftMessage, L, Profile, TravelRequest


class Email(BaseModel):
    subject: str
    body: str


def default_questions(cat: Catalog, program_id: str, profile: Profile) -> list[str]:
    p = cat.programs[program_id]
    school = cat.school_of(p)
    qs = [
        L(en="Is there space in the session I'm interested in?", es="¿Hay plazas en la sesión que me interesa?"),
        L(en="What is the total price including registration and any other fees?",
          es="¿Cuál es el precio total con inscripción y otras tarifas?"),
        L(en="Could you send your refund and cancellation policy in writing?",
          es="¿Podrían enviarme por escrito la política de reembolso y cancelación?"),
    ]
    if any(h.type == "homestay" for h in p.housing):
        qs.append(L(en="Can the homestay accommodate my dietary preferences?",
                    es="¿La familia anfitriona puede adaptarse a mis preferencias alimentarias?"))
    if p.category == "languages":
        qs.append(L(en="How do you assess my level before I arrive?", es="¿Cómo evalúan mi nivel antes de llegar?"))
    if profile.accessibility:
        qs.append(L(en="Can you confirm step-free access to classrooms and housing?",
                    es="¿Pueden confirmar acceso sin escalones a aulas y alojamiento?"))
    if school.verification.status == "unverified":
        qs.append(L(en="Could you share your business registration details?",
                    es="¿Podrían compartir sus datos de registro mercantil?"))
    return [getattr(q, profile.lang) for q in qs]


def new_proposal(cat: Catalog, program_id: str, profile: Profile) -> ActionProposal:
    p = cat.programs[program_id]
    return ActionProposal(
        id=f"prop-{uuid.uuid4().hex[:8]}",
        program_id=program_id,
        to=cat.school_of(p).email,
        questions=default_questions(cat, program_id, profile),
    )


class Application:
    def __init__(self, cat: Catalog, claude: Claude):
        self.cat = cat
        self.claude = claude

    def draft_inquiry(self, proposal: ActionProposal, profile: Profile, req: TravelRequest) -> DraftMessage:
        if proposal.status != "approved":
            raise PermissionError("Juni only drafts after the user approves the proposal")
        p = self.cat.programs[proposal.program_id]
        school = self.cat.school_of(p)
        lang = profile.lang
        session = next((s for s in p.sessions if month_of(s.start) in (req.months or [])), None) or next(
            (s for s in p.sessions if s.start > self.cat.today), None)
        when = f"{date(session.start, lang)} – {date(session.end, lang)}" if session else (
            "las próximas fechas disponibles" if lang == "es" else "your next available dates")
        name = profile.name or ("[Tu nombre]" if lang == "es" else "[Your name]")
        city = profile.home_city or ("[ciudad]" if lang == "es" else "[city]")
        weeks = f" ({req.weeks} {'semanas' if lang == 'es' else 'weeks'})" if req.weeks else ""

        email = self.claude.parse(
            Email,
            system=(
                "You draft short, polite inquiry emails from a prospective student to a school. "
                "Write in the requested language. Include every question exactly once as a bullet list. "
                "Do not promise payment, do not share passport or ID numbers, and do not invent facts."
            ),
            user=(
                f"Language: {'Spanish' if lang == 'es' else 'English'}\nSender: {name}, lives in {city}\n"
                f"School: {school.name}\nProgram: {p.title.es if lang == 'es' else p.title.en}\nDates: {when}{weeks}\n"
                "Questions:\n" + "\n".join(f"- {q}" for q in proposal.questions)
            ),
        )
        if email is None:
            qs = "\n".join(f"• {q}" for q in proposal.questions)
            if lang == "es":
                email = Email(
                    subject=f"Consulta: {p.title.es}",
                    body=(f"Hola, equipo de {school.name}:\n\nMe llamo {name} y vivo en {city}. Me interesa el programa "
                          f"\"{p.title.es}\" para {when}{weeks}.\n\nAntes de inscribirme, ¿podrían confirmarme lo siguiente?\n"
                          f"{qs}\n\nMuchas gracias,\n{name}"),
                )
            else:
                email = Email(
                    subject=f"Inquiry: {p.title.en}",
                    body=(f"Hello {school.name} team,\n\nMy name is {name} and I live in {city}. I'm interested in "
                          f"\"{p.title.en}\" for {when}{weeks}.\n\nBefore I apply, could you please confirm the following?\n"
                          f"{qs}\n\nThank you,\n{name}"),
                )
        return DraftMessage(
            id=f"draft-{uuid.uuid4().hex[:8]}",
            to=school.email,
            subject=email.subject,
            body=email.body,
            created_at=self.cat.today,
        )
