/**
 * Мягкая подложка при подгрузке lazy-страниц (без текста «Загрузка»).
 */
export default function PageSuspenseFallback() {
  return (
    <div className="flex-1 w-full animate-in fade-in duration-200">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="h-8 w-56 max-w-[70%] rounded-lg bg-muted/80 animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-xl bg-gradient-to-br from-muted/90 to-muted/40 animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
