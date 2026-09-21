import { Link } from 'react-router-dom'
export default function PageNotFound() {
  return <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><div className="text-center"><div className="text-7xl font-black">404</div><p className="mt-3 text-slate-300">Página não encontrada.</p><Link className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold" to="/dashboard">Voltar ao dashboard</Link></div></div>
}
