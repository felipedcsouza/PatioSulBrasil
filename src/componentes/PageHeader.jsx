export default function PageHeader({ title, description, actions }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{title}</h1>{description && <p className="mt-1 text-slate-500">{description}</p>}</div>{actions && <div>{actions}</div>}</div>
}
