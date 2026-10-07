import type { Review } from "@/lib/types";

// MOCK DATA — reviews are shown in the language they were written in.
export const reviews: Review[] = [
  { id: "r1", programId: "antigua-spanish-immersion", author: "Maya R.", homeCountry: "US", lang: "en", rating: 5, date: "2026-08-14", verifiedParticipant: true, text: "Went from barely ordering coffee to holding a 30-minute conversation in four weeks. My host family were wonderful and the school answered every question before I booked." },
  { id: "r2", programId: "antigua-spanish-immersion", author: "Thomas K.", homeCountry: "DE", lang: "en", rating: 4, date: "2026-06-02", verifiedParticipant: true, text: "Excellent teacher. Antigua is touristy, so you need discipline to keep speaking Spanish in the afternoons." },
  { id: "r3", programId: "xela-spanish-community", author: "Priya S.", homeCountry: "IN", lang: "en", rating: 5, date: "2026-07-21", verifiedParticipant: true, text: "Cheaper than Antigua and you really have to use your Spanish. The Wednesday talks about Guatemalan history were a highlight." },
  { id: "r4", programId: "xela-spanish-community", author: "Lucía M.", homeCountry: "AR", lang: "es", rating: 4, date: "2026-03-11", verifiedParticipant: true, text: "Vine a acompañar a mi pareja y terminé tomando también la introducción al k'iche'. Gente muy cálida y una escuela bien organizada." },
  { id: "r5", programId: "oaxaca-market-mole", author: "Daniel P.", homeCountry: "CA", lang: "en", rating: 5, date: "2026-02-28", verifiedParticipant: true, text: "The best food experience of my life. Doña Rosa's mole negro class is something I'll never forget." },
  { id: "r6", programId: "oaxaca-market-mole", author: "Ana G.", homeCountry: "ES", lang: "es", rating: 5, date: "2026-05-09", verifiedParticipant: true, text: "Muy bien organizado, grupos pequeños y cocineras que explican con paciencia. Llevad ropa cómoda para moler en metate." },
  { id: "r7", programId: "bologna-fresh-pasta", author: "Hannah L.", homeCountry: "GB", lang: "en", rating: 5, date: "2026-05-20", verifiedParticipant: true, text: "Hard work for the arms, pure joy for the heart. I now make tortellini at home every Sunday." },
  { id: "r8", programId: "florence-renaissance-drawing", author: "Kenji A.", homeCountry: "JP", lang: "en", rating: 5, date: "2026-07-03", verifiedParticipant: true, text: "As a complete beginner I was nervous, but the instructor adapted everything. Drawing in the Bargello was magical." },
  { id: "r9", programId: "chiangmai-farm-cooking", author: "Sofía V.", homeCountry: "MX", lang: "es", rating: 5, date: "2026-01-30", verifiedParticipant: true, text: "Súper recomendable y barato. Todo lo cocinamos con hierbas del huerto. Tienen opción vegana de verdad." },
  { id: "r10", programId: "athens-philosophy-summer", author: "Robert J.", homeCountry: "US", lang: "en", rating: 5, date: "2026-07-25", verifiedParticipant: true, text: "Retired engineer, no philosophy background. The lecturers made Aristotle feel alive. Reading the Apology on the Pnyx at sunset — unforgettable." },
  { id: "r11", programId: "athens-archaeology-field", author: "Camila T.", homeCountry: "CO", lang: "es", rating: 4, date: "2026-08-02", verifiedParticipant: true, text: "Muy exigente físicamente por el calor, pero el equipo es profesional y aprendí muchísimo en el laboratorio." },
  { id: "r12", programId: "lisbon-fado", author: "Grace O.", homeCountry: "GB", lang: "en", rating: 5, date: "2026-05-30", verifiedParticipant: true, text: "I can't sing and I still loved it. The listening nights in Alfama were worth the trip alone." },
  { id: "r13", programId: "kyoto-washoku", author: "Marie D.", homeCountry: "FR", lang: "en", rating: 5, date: "2026-04-15", verifiedParticipant: true, text: "Precise, calm and delicious. They adapted every dish for my vegetarian diet." },
  { id: "r14", programId: "xela-maya-anthropology", author: "Elena B.", homeCountry: "MX", lang: "es", rating: 5, date: "2026-07-10", verifiedParticipant: true, text: "Un enfoque ético de verdad: las comunidades deciden qué se comparte y reciben un pago justo. Muy recomendable." },
  { id: "r15", programId: "chiangmai-mountain-ecology", author: "Jonah W.", homeCountry: "AU", lang: "en", rating: 4, date: "2026-02-20", verifiedParticipant: true, text: "Great mix of science and practice. The village stay is basic — bring a headlamp." },
  { id: "r16", programId: "barcelona-street-photo", author: "Irene F.", homeCountry: "IT", lang: "en", rating: 5, date: "2026-06-28", verifiedParticipant: true, text: "The ethics session changed how I photograph people. The final zine is now framed in my living room." },
  { id: "r17", programId: "risk-florence-master-painter", author: "Anonymous", homeCountry: "—", lang: "en", rating: 5, date: "2026-09-01", verifiedParticipant: false, text: "Best academy!!! Certified master in 2 weeks!!! (Posted on the academy's own website — not verified.)" },
];

export function reviewsFor(programId: string): Review[] {
  return reviews.filter((r) => r.programId === programId);
}
