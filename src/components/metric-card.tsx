export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-black/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-steel">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gold">{detail}</p>
    </div>
  );
}
