import type { Category, CategoryId } from "@/lib/types";
import { photo } from "./photo";

export const categories: Category[] = [
  {
    id: "languages",
    name: { en: "Languages", es: "Idiomas" },
    blurb: { en: "Immersion courses with homestays and daily practice.", es: "Cursos de inmersión con familias anfitrionas y práctica diaria." },
    image: photo("photo-1546410531-bb4caa6b424d"),
  },
  {
    id: "cooking",
    name: { en: "Cooking & Culinary", es: "Cocina y gastronomía" },
    blurb: { en: "Market tours, home kitchens and professional techniques.", es: "Mercados, cocinas caseras y técnicas profesionales." },
    image: photo("photo-1556910103-1c02745aae4d"),
  },
  {
    id: "art",
    name: { en: "Art", es: "Arte" },
    blurb: { en: "Painting, ceramics, textiles and printmaking studios.", es: "Talleres de pintura, cerámica, textiles y grabado." },
    image: photo("photo-1513364776144-60967b0f800f"),
  },
  {
    id: "architecture",
    name: { en: "Architecture", es: "Arquitectura" },
    blurb: { en: "Drawing and design workshops in landmark cities.", es: "Talleres de dibujo y diseño en ciudades emblemáticas." },
    image: photo("photo-1487958449943-2429e8be8625"),
  },
  {
    id: "anthropology",
    name: { en: "Anthropology", es: "Antropología" },
    blurb: { en: "Ethical field programs with local communities.", es: "Programas de campo éticos con comunidades locales." },
    image: photo("photo-1528127269322-539801943592"),
  },
  {
    id: "philosophy",
    name: { en: "Philosophy", es: "Filosofía" },
    blurb: { en: "Summer schools for curious minds, no degree required.", es: "Escuelas de verano para mentes curiosas, sin título requerido." },
    image: photo("photo-1505664194779-8beaceb93744"),
  },
  {
    id: "history",
    name: { en: "History & Archaeology", es: "Historia y arqueología" },
    blurb: { en: "Excavations, museum labs and heritage walks.", es: "Excavaciones, laboratorios de museo y rutas patrimoniales." },
    image: photo("photo-1555993539-1732b0258235"),
  },
  {
    id: "music-dance",
    name: { en: "Music & Dance", es: "Música y danza" },
    blurb: { en: "Fado, flamenco, marimba and more, taught by locals.", es: "Fado, flamenco, marimba y más, con maestros locales." },
    image: photo("photo-1504609813442-a8924e83f76e"),
  },
  {
    id: "photo-film",
    name: { en: "Photography & Film", es: "Fotografía y cine" },
    blurb: { en: "Street, documentary and travel storytelling.", es: "Fotografía callejera, documental y de viaje." },
    image: photo("photo-1452587925148-ce544e77e70d"),
  },
  {
    id: "writing",
    name: { en: "Writing", es: "Escritura" },
    blurb: { en: "Workshops for fiction, memoir and travel writing.", es: "Talleres de ficción, memorias y escritura de viajes." },
    image: photo("photo-1455390582262-044cdead277a"),
  },
  {
    id: "wellness",
    name: { en: "Wellness & Yoga", es: "Bienestar y yoga" },
    blurb: { en: "Teacher trainings and restorative retreats.", es: "Formaciones de profesores y retiros restaurativos." },
    image: photo("photo-1506126613408-eca07ce68773"),
  },
  {
    id: "sustainability",
    name: { en: "Sustainability & Ecology", es: "Sostenibilidad y ecología" },
    blurb: { en: "Permaculture, conservation and climate field courses.", es: "Permacultura, conservación y cursos de campo climáticos." },
    image: photo("photo-1500382017468-9049fed747ef"),
  },
  {
    id: "volunteering",
    name: { en: "Volunteering + Learning", es: "Voluntariado + aprendizaje" },
    blurb: { en: "Study in the morning, contribute in the afternoon.", es: "Estudia por la mañana, colabora por la tarde." },
    image: photo("photo-1559027615-cd4628902d4a"),
  },
];

export function getCategory(id: CategoryId): Category {
  return categories.find((c) => c.id === id)!;
}
