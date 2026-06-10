'use client'

import { getMonthName } from '@/lib/supabase'

interface MonthSelectorProps {
  month: number
  year: number
  onPrev: () => void
  onNext: () => void
}

export default function MonthSelector({ month, year, onPrev, onNext }: MonthSelectorProps) {
  const isCurrentMonth = () => {
    const now = new Date()
    return month === now.getMonth() && year === now.getFullYear()
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a]
                   active:scale-90 transition-transform duration-100"
        aria-label="Mes anterior"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="flex flex-col items-center">
        <span className="text-white font-semibold text-base">
          {getMonthName(month, year)}
        </span>
        {isCurrentMonth() && (
          <span className="text-[10px] text-[#00e676] font-medium mt-0.5">Este mes</span>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a]
                   active:scale-90 transition-transform duration-100"
        aria-label="Mes siguiente"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
