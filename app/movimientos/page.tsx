'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import MonthSelector from '@/components/MonthSelector'
import { supabase, Movement, formatARS, formatDate, getCategoryEmoji, getCategoryLabel } from '@/lib/supabase'

type FilterType = 'todos' | 'ingreso' | 'gasto' | 'ahorro'

function MovimientosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userName, isLoading } = useUser()

  const initialType = (searchParams.get('type') as FilterType) || 'todos'
  const [filter, setFilter] = useState<FilterType>(initialType)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [movements, setMovements] = useState<Movement[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !userName) router.replace('/login')
  }, [isLoading, userName, router])

  const fetchMovements = useCallback(async () => {
    setLoadingData(true)
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
      const endMonth = currentMonth + 2
      const endYear = endMonth > 12 ? currentYear + 1 : currentYear
      const endMonthNum = endMonth > 12 ? 1 : endMonth
      const endDate = `${endYear}-${String(endMonthNum).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setMovements(data || [])
    } catch (err) {
      console.error('Error fetching movements:', err)
    } finally {
      setLoadingData(false)
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    if (userName) fetchMovements()
  }, [userName, fetchMovements])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('movements').delete().eq('id', id)
      if (error) throw error
      setMovements((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Error deleting movement:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }

  const filtered = filter === 'todos' ? movements : movements.filter((m) => m.type === filter)

  const totals = {
    ingreso: movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0),
    gasto: movements.filter((m) => m.type === 'gasto').reduce((s, m) => s + m.amount, 0),
    ahorro: movements.filter((m) => m.type === 'ahorro').reduce((s, m) => s + m.amount, 0),
  }

  const tabs: { key: FilterType; label: string; color: string; count: number }[] = [
    { key: 'todos', label: 'Todos', color: '#888888', count: movements.length },
    { key: 'ingreso', label: 'Ingresos', color: '#00e676', count: movements.filter((m) => m.type === 'ingreso').length },
    { key: 'gasto', label: 'Gastos', color: '#ef4444', count: movements.filter((m) => m.type === 'gasto').length },
    { key: 'ahorro', label: 'Ahorros', color: '#3b82f6', count: movements.filter((m) => m.type === 'ahorro').length },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="pt-4 px-4 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <MonthSelector month={currentMonth} year={currentYear} onPrev={handlePrevMonth} onNext={handleNextMonth} />
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-4 mb-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3 grid grid-cols-3 divide-x divide-[#2a2a2a]">
          <div className="text-center px-2">
            <p className="text-[#00e676] font-bold text-base">{formatARS(totals.ingreso)}</p>
            <p className="text-[#555555] text-[10px] mt-0.5">Ingresos</p>
          </div>
          <div className="text-center px-2">
            <p className="text-[#ef4444] font-bold text-base">{formatARS(totals.gasto)}</p>
            <p className="text-[#555555] text-[10px] mt-0.5">Gastos</p>
          </div>
          <div className="text-center px-2">
            <p className="text-[#3b82f6] font-bold text-base">{formatARS(totals.ahorro)}</p>
            <p className="text-[#555555] text-[10px] mt-0.5">Ahorros</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                filter === tab.key
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                  : 'bg-transparent border-transparent text-[#555555]'
              }`}
              style={filter === tab.key ? { borderColor: tab.color, color: tab.color } : {}}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 opacity-60">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Movements list */}
      <div className="px-4 pb-28">
        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#00e676] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-[#555555] text-sm">Sin movimientos en este período</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((mov) => {
              const isGasto = mov.type === 'gasto'
              const isIngreso = mov.type === 'ingreso'
              const color = isIngreso ? '#00e676' : mov.type === 'ahorro' ? '#3b82f6' : '#ef4444'
              const emoji = isIngreso ? '💰' : mov.type === 'ahorro' ? '🏦' : getCategoryEmoji(mov.category || 'otros')

              return (
                <div
                  key={mov.id}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight truncate">
                      {mov.description || getCategoryLabel(mov.category || 'otros')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[#555555] text-xs">{formatDate(mov.date)}</p>
                      <span className="text-[#333333] text-xs">·</span>
                      <p className="text-[#555555] text-xs">{mov.user_name}</p>
                      {mov.category && (
                        <>
                          <span className="text-[#333333] text-xs">·</span>
                          <p className="text-[#444444] text-xs">{getCategoryLabel(mov.category)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color }}>
                      {isGasto ? '-' : '+'}{formatARS(mov.amount)}
                    </p>
                    <button
                      onClick={() => handleDelete(mov.id)}
                      disabled={deletingId === mov.id}
                      className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center opacity-50 active:opacity-100 transition-opacity disabled:opacity-20"
                    >
                      {deletingId === mov.id ? (
                        <div className="w-3 h-3 border border-[#888888] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MovimientosContent />
    </Suspense>
  )
}
