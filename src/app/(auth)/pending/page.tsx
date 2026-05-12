import { signOut } from "@/actions/auth"

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-xl">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">
          Solicitud en revisión
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Tu cuenta está pendiente de aprobación. Un administrador revisará tu
          solicitud pronto.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
