export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950 p-5 md:grid md:grid-cols-2 md:p-0">
      <section className="hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-slate-900 to-slate-950 p-12 text-white md:flex">
        <div className="max-w-lg"><div className="mb-6 inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20">PÁTIO FLOW PRO</div><h2 className="text-5xl font-black leading-tight">Gestão de veículos, liberações e pátio em um só lugar.</h2><p className="mt-5 text-lg text-slate-300">Modelo funcional para você evoluir e conectar ao seu backend Base44.</p></div>
      </section>
      <section className="flex items-center justify-center p-3 md:p-10"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl md:p-9"><h1 className="text-3xl font-black text-slate-900">{title}</h1><p className="mt-2 text-slate-500">{subtitle}</p><div className="mt-7">{children}</div></div></section>
    </div>
  )
}
