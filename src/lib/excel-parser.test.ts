import { describe, expect, it } from "vitest"
import { applyMapping, guessMapping, parseDate, parseNumber, type RawRow } from "./excel-parser"

describe("parseDate", () => {
  it("Türkçe gg.aa.yyyy biçimini gün-ay olarak okur", () => {
    expect(parseDate("10.08.2024")?.slice(0, 10)).toBe("2024-08-10")
    expect(parseDate("05/02/2025")?.slice(0, 10)).toBe("2025-02-05")
  })
  it("ISO biçimini okur", () => {
    expect(parseDate("2026-05-03")?.slice(0, 10)).toBe("2026-05-03")
  })
  it("Excel seri numarasını okur", () => {
    expect(parseDate(45514)?.slice(0, 10)).toBe("2024-08-10")
  })
  it("Date nesnesinin yerel gününü korur", () => {
    expect(parseDate(new Date(2024, 7, 10))?.slice(0, 10)).toBe("2024-08-10")
  })
  it("geçersiz tarihleri reddeder", () => {
    expect(parseDate("31.02.2024")).toBeNull()
    expect(parseDate("yarın")).toBeNull()
    expect(parseDate(null)).toBeNull()
  })
})

describe("parseNumber", () => {
  it("virgül, yüzde ve ml eklerini temizler", () => {
    expect(parseNumber("12,5")).toBe(12.5)
    expect(parseNumber("%25")).toBe(25)
    expect(parseNumber("50 ml")).toBe(50)
    expect(parseNumber("abc")).toBeNull()
  })
})

// PARFUM.xlsx'teki gerçek başlık düzeni (boş + yinelenen başlıklar dahil)
const HEADERS = ["__EMPTY", "PARFÜM ADI ", "ESANS ML", "CİNSİYET", "ÜCRET", "KULLANILAN ESANS ORANI %", "YAPIM TARİHİ", "PARFÜM ML", "ESANS ML ", "ALKOL ML", "SU ML", "KALAN ESANS ML", "NOTLAR", "ESANS ML _1"]
const rows: RawRow[] = [
  { __EMPTY: "1.PARTİ", "PARFÜM ADI ": "Chanel - No:5", "ESANS ML": 25, "CİNSİYET": "Kadın", "ÜCRET": 96, "KULLANILAN ESANS ORANI %": 0.25, "YAPIM TARİHİ": new Date(2024, 7, 10), "PARFÜM ML": 50, "ESANS ML ": 12.5, "ALKOL ML": 35, "SU ML": 2.5, "KALAN ESANS ML": 12.5, NOTLAR: null },
  { __EMPTY: null, "PARFÜM ADI ": "Tom Ford - Noir De Noir", "ESANS ML": 25, "CİNSİYET": "Unisex", "ÜCRET": 204, "KULLANILAN ESANS ORANI %": null, "YAPIM TARİHİ": null, "PARFÜM ML": null, "ESANS ML ": 0, "ALKOL ML": null, "SU ML": null, "KALAN ESANS ML": 25, NOTLAR: null },
  { __EMPTY: "3.PARTİ", "PARFÜM ADI ": "Christian Dior - Sauvage", "ESANS ML": 0, "CİNSİYET": "erkek", "ÜCRET": 0, "KULLANILAN ESANS ORANI %": 25, "YAPIM TARİHİ": "08.02.2025", "PARFÜM ML": 50, "ESANS ML ": 12.5, "ALKOL ML": 35, "SU ML": 2.5, "KALAN ESANS ML": -13, NOTLAR: "Esans Bitti" },
  { __EMPTY: null, "PARFÜM ADI ": "", "ESANS ML": 25 },
]

describe("guessMapping", () => {
  const m = guessMapping(HEADERS, rows)
  it("yinelenen ESANS ML sütunlarını başlangıç / kullanılan olarak ayırır", () => {
    expect(m.esansMl).toBe("ESANS ML")
    expect(m.kullanilanEsansMl).toBe("ESANS ML ")
  })
  it("diğer alanları doğru eşleştirir", () => {
    expect(m.parfumAdi).toBe("PARFÜM ADI ")
    expect(m.esansOrani).toBe("KULLANILAN ESANS ORANI %")
    expect(m.kalanEsansMl).toBe("KALAN ESANS ML")
    expect(m.parfumMl).toBe("PARFÜM ML")
    expect(m.suMl).toBe("SU ML")
    expect(m.yapimTarihi).toBe("YAPIM TARİHİ")
    expect(m.cinsiyet).toBe("CİNSİYET")
  })
  it("başlıksız parti sütununu değerlerinden bulur", () => {
    expect(m.partiBilgisi).toBe("__EMPTY")
  })
})

describe("applyMapping", () => {
  const parsed = applyMapping(rows, guessMapping(HEADERS, rows))
  it("üretim satırını doğru ayrıştırır", () => {
    const r = parsed[0]
    expect(r.kind).toBe("batch")
    expect(r._errors).toEqual([])
    expect(r.esansOrani).toBe(0.25)
    expect(r.kullanilanEsansMl).toBe(12.5)
    expect(r.cinsiyet).toBe("KADIN")
    expect(r.yapimTarihi?.slice(0, 10)).toBe("2024-08-10")
  })
  it("parti/hacim olmayan satırı stok girişi sayar (hata değil)", () => {
    const r = parsed[1]
    expect(r.kind).toBe("stock")
    expect(r._errors).toEqual([])
    expect(r.cinsiyet).toBe("UNISEX")
  })
  it("25 oranını %25'e çevirir, negatif kalanı uyarıyla yok sayar", () => {
    const r = parsed[2]
    expect(r.esansOrani).toBe(0.25)
    expect(r.kalanEsansMl).toBeUndefined()
    expect(r._warnings.some((w) => w.includes("negatif"))).toBe(true)
    expect(r.cinsiyet).toBe("ERKEK")
  })
  it("adı boş satırı hata olarak işaretler", () => {
    expect(parsed[3]._errors).toContain("Parfüm adı boş")
  })
})
