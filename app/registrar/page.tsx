'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import CategoryGrid from '@/components/CategoryGrid'
import { supabase, formatARS } from '@/lib/supabase'

type MovementType = 'gasto' | 'ingreso' | 'ahorro'

const TABS: { id: MovementType; label: string }[] = [
  { id: 'gasto', label: 'Gasto' },
  { id: 'ingreso', label: 'Ingreso' },
  { id: 'ahorro', label: 'Ahorro' },
]

export default function RegistrarPage() {
  const router = useRouter()
  const { userName, isLoading } = useUser()
  const [type, setType] = useState<MovementType>('gasto')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('otros')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '')
    // Allow only one decimal point
    const parts = val.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(val)
  }

  const handleTypeChange = (newType: MovementType) => {
    setType(newType)
    if (newType !== 'gasto') {
      setCategory('')
    } else {
      setCategory('otros')
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    if (type === 'gasto' && !category) {
      setError('Seleccioná una categoría')
      return
    }
    if (!userName) return

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase
        .from('movements')
        .insert([{
          user_name: userName,
          type,
          amount: parseFloat(amount),
          category: type === 'gasto' ? category : null,
          description: description.trim() || null,
          date,
        }])

      if (dbError) throw dbError

      setSuccess(true)
      // Reset form
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('otros')

      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error saving movement:', err)
      setError('Error al guardar. Verificá que Supabase esté configurado.')
    } finally {
      setSaving(false)
    }
  }

  const tabColors: Record<MovementType, string> = {
    gasto: '#ef4444',
    ingreso: '#00e676',
    ahorro: '#3b82f6',
  }

  const tabLabels: Record<MovementType, string> = {
    gasto: 'Registrar gasto',
    ingreso: 'Registrar ingreso',
    ahorro: 'Registrar ahorro',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background page-transition">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white text-2xl font-bold">Registrar</h1>
        <p className="text-[#555555] text-sm mt-1">Nuevo movimiento</p>
      </div>

      {/* Type tabs */}
      <div className="px-4 mb-6">
        <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150
                ${type === tab.id
                  ? 'bg-[#0a0a0a] text-white shadow-sm'
                  : 'text-[#555555]'
                }`}
              style={type === tab.id ? { color: tabColors[tab.id] } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div className="px-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col items-center">
          <p className="text-[#555555] text-xs mb-3 uppercase tracking-wide">Monto en ARS</p>
          <div className="flex items-center gap-2 w-full justify-center">
            <span className="text-[#555555] text-3xl font-bold">$</span>
            <input
              type="number"
              inputMode="decimal"
              className="amount-input flex-1"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              style={{ color: amount ? tabColors[type] : undefined }}
            />
          </div>
          {amount && (
            <p className="text-[#555555] text-xs mt-2">
              {formatARS(parseFloat(amount) || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Category grid (only for gastos) */}
      {type === 'gasto' && (
        <div className="px-4 mb-4">
          <p className="text-[#888888] text-xs uppercase tracking-wide mb-3">Categoría</p>
          <CategoryGrid
            selected={category}
            onSelect={setCategory}
          />
        </div>
      )}

      {/* Description */}
      <div className="px-4 mb-4">
        <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Concepto</p>
        <input
          type="text"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3
                     text-white placeholder-[#333333] text-sm
                     focus:outline-none focus:border-[#444444] transition-colors"
          placeholder={type === 'gasto' ? 'ej: Almuerzo con amigos' : type === 'ingreso' ? 'ej: Sueldo marzo' : 'ej: Ahorro mensual'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Date */}
      <div className="px-4 mb-6">
        <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Fecha</p>
        <input
          type="date"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3
                     text-white text-sm
                     focus:outline-none focus:border-[#444444] transition-colors
                     [color-scheme:dark]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 mb-4">
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-3">
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="px-4 mb-4">
          <div className="bg-[#00e676]/10 border border-[#00e676]/30 rounded-xl px-4 py-3">
            <p className="text-[#00e676] text-sm">✓ Movimiento registrado exitosamente</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="px-4 mb-4">
        <button
          onClick={handleSubmit}
          disabled={saving || !amount}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-150
                     disabled:opacity-40 active:scale-95"
          style={{
            backgroundColor: tabColors[type],
            color: type === 'ingreso' ? '#0a0a0a' : '#ffffff',
          }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Guardando...
            </span>
          ) : (
            tabLabels[type]
          )}
        </button>
      </div>

      <div className="h-24" />
      <BottomNav />
    </div>
  )
}
