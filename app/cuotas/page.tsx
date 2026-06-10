'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import { supabase, Installment, formatARS } from '@/lib/supabase'

function getInstallmentProgress(installment: Installment): {
  current: number
  remaining: number
  monthsElapsed: number
} {
  const startDate = new Date(installment.start_date + 'T00:00:00')
  const now = new Date()

  const monthsElapsed =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth())

  const current = Math.min(
    Math.max(1, monthsElapsed + 1),
    installment.installments_count
  )
  const remaining = installment.installments_count - current + 1

  return { current, remaining, monthsElapsed }
}

export default function CuotasPage() {
  const router = useRouter()
  const { userName, isLoading } = useUser()
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentsCount, setInstallmentsCount] = useState('12')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  const fetchInstallments = useCallback(async () => {
    setLoadingData(true)
    try {
      const { data, error: dbError } = await supabase
        .from('installments')
        .select('*')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setInstallments(data || [])
    } catch (err) {
      console.error('Error fetching installments:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (userName) fetchInstallments()
  }, [userName, fetchInstallments])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Ingresá un nombre')
      return
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    if (!installmentsCount || parseInt(installmentsCount) < 1) {
      setError('Ingresá la cantidad de cuotas')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('installments').insert([{
        name: name.trim(),
        total_amount: parseFloat(totalAmount),
        installments_count: parseInt(installmentsCount),
        current_installment: 1,
        start_date: startDate,
      }])

      if (dbError) throw dbError

      setName('')
      setTotalAmount('')
      setInstallmentsCount('12')
      setStartDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      await fetchInstallments()
    } catch (err) {
      console.error('Error saving installment:', err)
      setError('Error al guardar. Verificá que Supabase esté configurado.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { error: dbError } = await supabase
        .from('installments')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError
      setInstallments((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('Error deleting installment:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const totalMonthly = installments.reduce((sum, inst) => {
    const { current } = getInstallmentProgress(inst)
    if (current <= inst.installments_count) {
      return sum + inst.monthly_amount
    }
    return sum
  }, 0)

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
            <h1 className="text-white text-2xl font-bold">Cuotas</h1>
            <p className="text-[#555555] text-sm mt-1">Compras en cuotas</p>
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

      {/* Monthly total */}
      {installments.length > 0 && (
        <div className="px-4 py-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-[#888888] text-sm">Este mes en cuotas</p>
            <p className="text-[#ef4444] text-xl font-bold">{formatARS(totalMonthly)}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Nueva compra en cuotas</h3>

            <div>
              <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Nombre</p>
              <input
                type="text"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                           text-white placeholder-[#333333] text-sm
                           focus:outline-none focus:border-[#444444] transition-colors"
                placeholder="ej: Heladera, Notebook, Celular..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div>
              <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Precio total</p>
              <div className="flex items-center gap-2">
                <span className="text-[#555555] text-lg font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                             text-white placeholder-[#333333] text-sm
                             focus:outline-none focus:border-[#444444] transition-colors"
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Cuotas</p>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                             text-white placeholder-[#333333] text-sm
                             focus:outline-none focus:border-[#444444] transition-colors"
                  placeholder="12"
                  min="1"
                  max="60"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                />
              </div>
              <div>
                <p className="text-[#888888] text-xs uppercase tracking-wide mb-2">Primer cuota</p>
                <input
                  type="date"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                             text-white text-sm
                             focus:outline-none focus:border-[#444444] transition-colors
                             [color-scheme:dark]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            {/* Preview */}
            {totalAmount && installmentsCount && (
              <div className="bg-[#111111] rounded-xl px-4 py-3">
                <p className="text-[#555555] text-xs">Cuota mensual</p>
                <p className="text-[#00e676] text-lg font-bold">
                  {formatARS(parseFloat(totalAmount) / parseInt(installmentsCount) || 0)}
                </p>
              </div>
            )}

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
        ) : installments.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">💳</p>
            <p className="text-[#555555] text-base">Sin cuotas registradas</p>
            <p className="text-[#333333] text-sm mt-1">Tocá + para agregar una</p>
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((inst) => {
              const { current, remaining } = getInstallmentProgress(inst)
              const isFinished = current > inst.installments_count
              const progress = Math.min((current - 1) / inst.installments_count, 1)
              const isExpanded = expandedId === inst.id

              return (
                <div
                  key={inst.id}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden"
                >
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between"
                    onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-lg flex-shrink-0">
                        💳
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-white text-sm font-medium truncate">{inst.name}</p>
                        <p className="text-[#555555] text-xs">
                          {isFinished ? (
                            <span className="text-[#00e676]">✓ Pagada</span>
                          ) : (
                            `Cuota ${current}/${inst.installments_count} · ${remaining} restantes`
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <p className={`font-semibold text-sm ${isFinished ? 'text-[#555555]' : 'text-[#ef4444]'}`}>
                        {formatARS(inst.monthly_amount)}/mes
                      </p>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div className="px-4 pb-3">
                    <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-[#00e676]' : 'bg-[#ef4444]'}`}
                        style={{ width: `${Math.min(progress * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[#2a2a2a] px-4 py-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111111] rounded-xl px-3 py-2">
                          <p className="text-[#555555] text-xs">Total</p>
                          <p className="text-white text-sm font-semibold">{formatARS(inst.total_amount)}</p>
                        </div>
                        <div className="bg-[#111111] rounded-xl px-3 py-2">
                          <p className="text-[#555555] text-xs">Cuota mensual</p>
                          <p className="text-white text-sm font-semibold">{formatARS(inst.monthly_amount)}</p>
                        </div>
                        <div className="bg-[#111111] rounded-xl px-3 py-2">
                          <p className="text-[#555555] text-xs">Inicio</p>
                          <p className="text-white text-sm font-semibold">
                            {new Date(inst.start_date + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="bg-[#111111] rounded-xl px-3 py-2">
                          <p className="text-[#555555] text-xs">Restante</p>
                          <p className={`text-sm font-semibold ${isFinished ? 'text-[#00e676]' : 'text-[#ef4444]'}`}>
                            {isFinished ? 'Terminada' : formatARS(inst.monthly_amount * remaining)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(inst.id)}
                        disabled={deletingId === inst.id}
                        className="w-full py-2.5 rounded-xl border border-[#ef4444]/30 text-[#ef4444] text-sm font-medium
                                   active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {deletingId === inst.id ? (
                          <><span className="w-3 h-3 border border-[#ef4444] border-t-transparent rounded-full animate-spin" /> Eliminando...</>
                        ) : (
                          'Eliminar cuota'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-24" />
      <BottomNav />
    </div>
  )
}
