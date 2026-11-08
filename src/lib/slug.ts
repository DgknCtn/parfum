export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/** Benzersiz slug ile kayıt oluşturur: unique çakışmasında (P2002) kısa rastgele ekle tekrar dener. */
export async function createWithUniqueSlug<T>(name: string, create: (slug: string) => Promise<T>): Promise<T> {
  const base = generateSlug(name) || "parfum"
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    try {
      return await create(slug)
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") continue
      throw e
    }
  }
  return create(`${base}-${Date.now()}`)
}
