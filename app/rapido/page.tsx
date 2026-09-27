'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import { supabase, formatARS } from '@/lib/supabase'

type MovementType = 'gasto' | 'ingreso' | 'ahorro'

const CATEGORIES = [
  { id: 'comida', emoji: '🍔', label: 'Comida' },
  { id: 'vivienda', emoji: '🏠', label: 'Vivienda' },
  { id: 'servicios', emoji: '💡', label: 'Servicios' },
  { id: 'entretenimiento', emoji: '🎬', label: 'Entret.' },
  { id: 'deudas', emoji: '💳', label: 'Deudas' },
  { id: 'salud', emoji: '💊', label: 'Salud' },
  { id: 'transporte', emoji: '🚗', label: 'Transp.' },
  { id: 'otros', emoji: '📦', label: 'Otros' },
]

const TYPE_COLORS: Record<MovementType, string> = {
  gasto: '#ef4444',
  ingreso: '#00e676',
  ahorro: '#3b82f6',
}

function RapidoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userName, isLoading } = useUser()

  const [type, setType] = useState<MovementType>('gasto')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('comida')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login?redirect=/rapido')
    }
  }, [isLoading, userName, router])

  const handleDigit = (d: string) => {
    if (amount === '0') return
    if (amount.length >= 10) return
    setAmount((prev) => prev + d)
  }

  const handleDelete = () => setAmount((prev) => prev.slice(0, -1))

  const displayAmount = amount
    ? formatARS(parseInt(amount, 10))
    : '$0'

  const handleSave = async () => {
    if (!amount || parseInt(amount, 10) <= 0 || !userName) return
    setSaving(true)
    try {
      const { error } = await supabase.from('movements').insert([{
        user_name: userName,
        type,
        amount: parseInt(amount, 10),
        category: type === 'gasto' ? category : null,
        description: null,
        date: new Date().toISOString().split('T')[0],
      }])
      if (error) throw error
      setSuccess(true)
      setAmount('')
      setTimeout(() => {
        setSuccess(false)
      }, 1500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#00e676] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const color = TYPE_COLORS[type]

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] max-w-[430px] mx-auto select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-2">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[#555] text-sm">{userName}</span>
        <div className="w-9" />
      </div>

      {/* Type selector */}
      <div className="px-5 mt-4">
        <div className="flex bg-[#1a1a1a] rounded-2xl p-1 border border-[#2a2a2a]">
          {(['gasto', 'ingreso', 'ahorro'] as MovementType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={type === t
                ? { backgroundColor: '#0a0a0a', color: TYPE_COLORS[t] }
                : { color: '#555' }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Amount display */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4">
        <p className="text-[#555] text-xs uppercase tracking-widest mb-3">Monto</p>
        <p
          className="text-5xl font-bold tabular-nums transition-colors duration-200"
          style={{ color: amount ? color : '#333' }}
        >
          {displayAmount}
        </p>

        {/* Success flash */}
        {success && (
          <div className="mt-4 px-5 py-2 rounded-full bg-[#00e676]/10 border border-[#00e676]/30">
            <p className="text-[#00e676] text-sm font-medium">✓ Registrado</p>
          </div>
        )}
      </div>

      {/* Category grid (only for gastos) */}
      {type === 'gasto' && (
        <div className="px-5 mb-4">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-all duration-150"
                style={category === cat.id
                  ? { backgroundColor: '#00e676/10', borderColor: '#00e676', background: 'rgba(0,230,118,0.08)' }
                  : { borderColor: '#2a2a2a', background: '#1a1a1a' }}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-medium" style={{ color: category === cat.id ? '#00e676' : '#666' }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Numeric keypad */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((key) => (
            <button
              key={key}
              onClick={() => key === '⌫' ? handleDelete() : handleDigit(key)}
              className="h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xl font-semibold
                         active:bg-[#2a2a2a] active:scale-95 transition-all duration-100 flex items-center justify-center"
            >
              {key === '⌫' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : key}
            </button>
          ))}
        </div>
      </div>

      {/* Register button */}
      <div className="px-5 pb-10">
        <button
          onClick={handleSave}
          disabled={!amount || parseInt(amount, 10) === 0 || saving}
          className="w-full h-14 rounded-2xl font-bold text-lg transition-all duration-150 active:scale-95 disabled:opacity-30"
          style={{ backgroundColor: color, color: type === 'ingreso' ? '#0a0a0a' : '#fff' }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Guardando...
            </span>
          ) : (
            `Registrar ${type}`
          )}
        </button>
      </div>

    </div>
  )
}

export default function RapidoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#00e676] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RapidoContent />
    </Suspense>
  )
}
