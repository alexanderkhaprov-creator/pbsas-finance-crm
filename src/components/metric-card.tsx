export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-black/10 bg-white p-5 shadow-soft">
      <p className="min-w-0 break-words text-sm font-medium text-steel">{label}</p>
      <p className="mt-3 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[clamp(0.8rem,1vw,1.5rem)] font-semibold leading-tight text-ink tabular-nums">{value}</p>
      <p className="mt-2 min-w-0 break-words text-xs uppercase tracking-[0.16em] text-gold">{detail}</p>
    </div>
  );
}
