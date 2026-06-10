'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import CategoryGrid from '@/components/CategoryGrid'
import { supabase, FixedExpense, formatARS, getCategoryEmoji, getCategoryLabel } from '@/lib/supabase'

export default function FijosPage() {
  const router = useRouter()
  const { userName, isLoading } = useUser()
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('servicios')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  const fetchExpenses = useCallback(async () => {
    setLoadingData(true)
    try {
      const { data, error: dbError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setExpenses(data || [])
    } catch (err) {
      console.error('Error fetching fixed expenses:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (userName) fetchExpenses()
  }, [userName, fetchExpenses])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Ingresá un nombre')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('fixed_expenses').insert([{
        name: name.trim(),
        amount: parseFloat(amount),
        category,
        active: true,
      }])

      if (dbError) throw dbError

      setName('')
      setAmount('')
      setCategory('servicios')
      setShowForm(false)
      await fetchExpenses()
    } catch (err) {
      console.error('Error saving fixed expense:', err)
      setError('Error al guardar. Verificá que Supabase esté configurado.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { error: dbError } = await supabase
        .from('fixed_expenses')
        .update({ active: false })
        .eq('id', id)

      if (dbError) throw dbError
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      console.error('Error deleting fixed expense:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

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
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Gastos Fijos</h1>
            <p className="text-[#555555] text-sm mt-1">Pagos mensuales recurrentes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-10 h-10 rounded-full bg-[#00e676] flex items-center justify-center
                       active:scale-90 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {showForm
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Total */}
      {expenses.length > 0 && (
        <div className="px-4 py-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-[#888888] text-sm">Total mensual</p>
            <p className="text-[#ef4444] text-xl font-bold">{formatARS(total)}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Nuevo gasto fijo</h3>

            <div>
              <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Nombre</p>
              <input
                type="text"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                           text-white placeholder-[#333333] text-sm
                           focus:outline-none focus:border-[#444444] transition-colors"
                placeholder="ej: Netflix, Alquiler, Gimnasio..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div>
              <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Monto mensual</p>
              <div className="flex items-center gap-2">
                <span className="text-[#555555] text-lg font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                             text-white placeholder-[#333333] text-sm
                             focus:outline-none focus:border-[#444444] transition-colors"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Categoría</p>
              <CategoryGrid selected={category} onSelect={setCategory} />
            </div>

            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-3">
                <p className="text-[#ef4444] text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#00e676] text-[#0a0a0a] font-semibold text-sm
                           active:scale-95 transition-transform disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="px-4 py-3 rounded-xl bg-[#2a2a2a] text-[#888888] font-medium text-sm
                           active:scale-95 transition-transform"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-4 py-3">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#00e676] rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔄</p>
            <p className="text-[#555555] text-base">Sin gastos fijos</p>
            <p className="text-[#333333] text-sm mt-1">Tocá + para agregar uno</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-xl flex-shrink-0">
                    {getCategoryEmoji(expense.category)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{expense.name}</p>
                    <p className="text-[#555555] text-xs">{getCategoryLabel(expense.category)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[#ef4444] font-semibold text-sm">{formatARS(expense.amount)}</p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                    className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center
                               active:scale-90 transition-transform disabled:opacity-50"
                  >
                    {deletingId === expense.id ? (
                      <div className="w-3 h-3 border border-[#555555] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-24" />
      <BottomNav />
    </div>
  )
}
