import { GoogleLoginButton } from "@/components/auth/google-login-button"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 w-full max-w-sm text-center shadow-xl">
        <div className="text-2xl font-extrabold text-slate-900 mb-1">
          💰 GestiónPréstamos
        </div>
        <p className="text-sm text-slate-500 mb-8">
          Plataforma de gestión de préstamos y cobranzas
        </p>

        <GoogleLoginButton />

        <p className="text-xs text-slate-400 mt-6">
          Tu acceso quedará pendiente de aprobación por un administrador.
        </p>
      </div>
    </div>
  )
}
