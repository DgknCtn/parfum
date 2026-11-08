/** Supabase auth hatalarını kullanıcı dostu Türkçe mesajlara çevirir. */
export function authErrorMessage(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  const msg = (error?.message ?? "").toLowerCase()
  const code = error?.code ?? ""
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "E-posta veya şifre hatalı."
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "E-posta adresi henüz doğrulanmamış."
  if (error?.status === 429 || msg.includes("rate limit") || code.includes("rate_limit"))
    return "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin."
  if (code === "weak_password" || msg.includes("password should be")) return "Şifre çok zayıf. En az 8 karakter kullanın."
  if (code === "same_password" || msg.includes("should be different")) return "Yeni şifre eskisinden farklı olmalı."
  if (msg.includes("expired") || msg.includes("invalid") || code === "otp_expired")
    return "Bağlantının süresi dolmuş veya geçersiz. Lütfen yeni bir sıfırlama bağlantısı isteyin."
  if (msg.includes("fetch") || msg.includes("network")) return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et."
  return "İşlem başarısız oldu. Lütfen tekrar deneyin."
}
