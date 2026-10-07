// Placeholder photography is loaded from Unsplash. Every <Photo> falls back to a
// designed gradient when an image fails to load, so the UI never shows a broken
// image. Replace with licensed school/destination photos before launch.
export function photo(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;
}
