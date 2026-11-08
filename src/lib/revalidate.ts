import { revalidatePath } from "next/cache"

/** Public katalogdaki tüm önbelleklenmiş sayfaları geçersiz kılar (admin değişikliklerinden sonra çağrılır). */
export function revalidateCatalog() {
  try {
    revalidatePath("/")
    revalidatePath("/p/[slug]", "page")
    revalidatePath("/karsilastir")
    revalidatePath("/sitemap.xml")
    revalidatePath("/api/public/perfumes")
  } catch (e) {
    console.error("revalidateCatalog failed", e)
  }
}
