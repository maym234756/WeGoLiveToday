type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
};

export default function StatCard({ label, value, hint, trend = 'flat' }: StatCardProps) {
  const color =
    trend === 'up' ? 'text-emerald-400' :
    trend === 'down' ? 'text-red-400' :
    'text-zinc-400';
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint && <div className={`mt-1 text-xs ${color}`}>{hint}</div>}
    </div>
  );
}
