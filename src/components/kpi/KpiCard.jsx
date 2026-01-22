export default function KpiCard({ label, value }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-950/50">
      <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
