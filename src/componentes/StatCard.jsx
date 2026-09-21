export default function StatCard({ label, value, detail }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-900">{value}</p>{detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}</div>
}
