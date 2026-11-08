export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor...</span>
      <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "var(--secondary)" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--secondary)" }} />
        ))}
      </div>
      <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--secondary)" }} />
    </div>
  )
}
