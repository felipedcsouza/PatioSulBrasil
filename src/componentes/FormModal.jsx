export default function FormModal({ open, title, onClose, children }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">✕</button></div>{children}</div></div>
}
