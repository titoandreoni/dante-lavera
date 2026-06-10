'use client'

import { useRouter } from 'next/navigation'

const USER1 = process.env.NEXT_PUBLIC_USER1_NAME || 'Tito'
const USER2 = process.env.NEXT_PUBLIC_USER2_NAME || 'Pareja'

export default function LoginPage() {
  const router = useRouter()

  const handleSelectUser = (name: string) => {
    localStorage.setItem('userName', name)
    router.replace('/inicio')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background page-transition">
      {/* Logo / Title */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">💸</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Dante Lavera</h1>
        <p className="text-text-secondary text-sm">Control de gastos compartidos</p>
      </div>

      {/* Question */}
      <div className="w-full max-w-xs">
        <p className="text-center text-text-secondary text-base mb-6">¿Quién sos?</p>

        {/* User buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleSelectUser(USER1)}
            className="w-full py-5 rounded-2xl bg-card border border-border text-white text-xl font-semibold
                       hover:border-accent-green hover:bg-card-hover active:scale-95
                       transition-all duration-150"
          >
            {USER1}
          </button>
          <button
            onClick={() => handleSelectUser(USER2)}
            className="w-full py-5 rounded-2xl bg-card border border-border text-white text-xl font-semibold
                       hover:border-accent-green hover:bg-card-hover active:scale-95
                       transition-all duration-150"
          >
            {USER2}
          </button>
        </div>
      </div>

      <p className="mt-12 text-text-muted text-xs">
        Tu selección se guarda localmente
      </p>
    </div>
  )
}
