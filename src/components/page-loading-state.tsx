export function PageLoadingState() {
  return (
    <div className="space-y-6">
      <div className="rounded border border-black/10 bg-white p-5 shadow-soft">
        <div className="h-5 w-72 animate-pulse rounded bg-black/10" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-black/5" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="rounded border border-black/10 bg-white p-4 shadow-soft" key={index}>
            <div className="h-4 w-28 animate-pulse rounded bg-black/10" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded bg-black/5" />
          </div>
        ))}
      </div>
      <div className="rounded border border-black/10 bg-white shadow-soft">
        <div className="border-b border-black/10 p-4">
          <div className="h-4 w-52 animate-pulse rounded bg-black/10" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-10 animate-pulse rounded bg-black/5" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
