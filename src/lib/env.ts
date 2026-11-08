/**
 * Ortam değişkeni doğrulaması: eksikse anlaşılır bir hata verir (non-null assertion yerine).
 * NEXT_PUBLIC_* değişkenleri derleme anında gömüldüğü için literal olarak okunur.
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Eksik ortam değişkeni: ${name}. .env.local veya Vercel proje ayarlarına ekleyin.`)
  return value
}

export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}
