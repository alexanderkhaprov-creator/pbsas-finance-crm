export function PageHeader({ title, description, actionLabel }: { title: string; description: string; actionLabel?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-steel">{description}</p>
      </div>
      {actionLabel ? (
        <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-[#d7b445]">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
