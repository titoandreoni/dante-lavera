'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import MonthSelector from '@/components/MonthSelector'
import {
  supabase,
  Movement,
  formatARS,
  formatDate,
  getCategoryEmoji,
  getCategoryLabel,
} from '@/lib/supabase'

interface MonthStats {
  ingresos: number
  gastos: number
  movimientosIngresos: number
  movimientosGastos: number
  topCategories: { id: string; total: number; percentage: number }[]
  recentMovements: Movement[]
}

export default function InicioPage() {
  const router = useRouter()
  const { userName, isLoading, greeting } = useUser()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState<MonthStats>({
    ingresos: 0,
    gastos: 0,
    movimientosIngresos: 0,
    movimientosGastos: 0,
    topCategories: [],
    recentMovements: [],
  })
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  const fetchData = useCallback(async () => {
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

      const movements: Movement[] = data || []

      const ingresos = movements
        .filter((m) => m.type === 'ingreso')
        .reduce((sum, m) => sum + m.amount, 0)

      const gastos = movements
        .filter((m) => m.type === 'gasto')
        .reduce((sum, m) => sum + m.amount, 0)

      const movimientosIngresos = movements.filter((m) => m.type === 'ingreso').length
      const movimientosGastos = movements.filter((m) => m.type === 'gasto').length

      // Top categories
      const categoryTotals: Record<string, number> = {}
      movements
        .filter((m) => m.type === 'gasto' && m.category)
        .forEach((m) => {
          categoryTotals[m.category!] = (categoryTotals[m.category!] || 0) + m.amount
        })

      const topCategories = Object.entries(categoryTotals)
        .map(([id, total]) => ({
          id,
          total,
          percentage: gastos > 0 ? (total / gastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)

      setStats({
        ingresos,
        gastos,
        movimientosIngresos,
        movimientosGastos,
        topCategories,
        recentMovements: movements.slice(0, 5),
      })
    } catch (err) {
      console.error('Error fetching movements:', err)
    } finally {
      setLoadingData(false)
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    if (userName) {
      fetchData()
    }
  }, [userName, fetchData])

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const ahorro = stats.ingresos - stats.gastos
  const ahorroPercent =
    stats.ingresos > 0 ? Math.round((ahorro / stats.ingresos) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Month selector */}
      <div className="pt-4">
        <MonthSelector
          month={currentMonth}
          year={currentYear}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
      </div>

      {/* Greeting */}
      <div className="px-4 pt-2 pb-4">
        <p className="text-text-secondary text-sm">{greeting},</p>
        <h1 className="text-white text-2xl font-bold">{userName}</h1>
      </div>

      {/* Balance badge */}
      <div className="px-4 mb-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[#888888] text-xs mb-1">Saldo del mes</p>
            <p
              className={`text-2xl font-bold ${
                ahorro >= 0 ? 'text-[#00e676]' : 'text-[#ef4444]'
              }`}
            >
              {formatARS(ahorro)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#888888] text-xs mb-1">Ahorro</p>
            <p
              className={`text-lg font-semibold ${
                ahorroPercent >= 0 ? 'text-[#00e676]' : 'text-[#ef4444]'
              }`}
            >
              {ahorroPercent}%
            </p>
          </div>
        </div>
      </div>

      {/* Ingresos / Gastos cards */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        {/* Ingresos */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#00e676]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </div>
            <span className="text-[#888888] text-xs font-medium uppercase tracking-wide">Ingresos</span>
          </div>
          <p className="text-[#00e676] text-xl font-bold">{formatARS(stats.ingresos)}</p>
          <p className="text-[#555555] text-xs mt-1">
            {stats.movimientosIngresos} {stats.movimientosIngresos === 1 ? 'movimiento' : 'movimientos'}
          </p>
        </div>

        {/* Gastos */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 12-7 7-7-7" />
                <path d="M12 5v14" />
              </svg>
            </div>
            <span className="text-[#888888] text-xs font-medium uppercase tracking-wide">Gastos</span>
          </div>
          <p className="text-[#ef4444] text-xl font-bold">{formatARS(stats.gastos)}</p>
          <p className="text-[#555555] text-xs mt-1">
            {stats.movimientosGastos} {stats.movimientosGastos === 1 ? 'movimiento' : 'movimientos'}
          </p>
        </div>
      </div>

      {/* Top categories */}
      {stats.topCategories.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Top categorías</h3>
            <div className="space-y-3">
              {stats.topCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getCategoryEmoji(cat.id)}</span>
                      <span className="text-[#cccccc] text-sm">{getCategoryLabel(cat.id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{formatARS(cat.total)}</span>
                      <span className="text-[#555555] text-xs">{Math.round(cat.percentage)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ef4444] rounded-full progress-bar-fill"
                      style={{ '--progress-width': `${cat.percentage}%`, width: `${cat.percentage}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div className="px-4 mb-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Últimos movimientos</h3>
            {loadingData && (
              <div className="w-4 h-4 border border-[#2a2a2a] border-t-[#00e676] rounded-full animate-spin" />
            )}
          </div>

          {stats.recentMovements.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">💸</p>
              <p className="text-[#555555] text-sm">Sin movimientos este mes</p>
              <p className="text-[#333333] text-xs mt-1">¡Registrá tu primer gasto!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentMovements.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#222222] flex items-center justify-center text-lg flex-shrink-0">
                      {mov.type === 'ingreso' ? '💰' : mov.type === 'ahorro' ? '🏦' : getCategoryEmoji(mov.category || 'otros')}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium leading-tight">
                        {mov.description || getCategoryLabel(mov.category || 'otros')}
                      </p>
                      <p className="text-[#555555] text-xs">
                        {formatDate(mov.date)} · {mov.user_name}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                      mov.type === 'ingreso'
                        ? 'text-[#00e676]'
                        : mov.type === 'ahorro'
                        ? 'text-[#3b82f6]'
                        : 'text-[#ef4444]'
                    }`}
                  >
                    {mov.type === 'gasto' ? '-' : '+'}{formatARS(mov.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-24" />
      <BottomNav />
    </div>
  )
}
