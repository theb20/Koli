/** Fallback Suspense léger pour le chargement des chunks de route (code-splitting). */
export function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-label="Chargement de la page">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

export default RouteLoader
