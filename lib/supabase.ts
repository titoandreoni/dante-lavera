import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Browser client for client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Movement {
  id: string
  user_name: string
  type: 'gasto' | 'ingreso' | 'ahorro'
  amount: number
  category: string | null
  description: string | null
  date: string
  created_at: string
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  category: string
  active: boolean
  created_at: string
}

export interface Installment {
  id: string
  name: string
  total_amount: number
  installments_count: number
  current_installment: number
  monthly_amount: number
  start_date: string
  created_at: string
}

// Format amount as Argentine peso
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date in Spanish
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

// Get month name in Spanish
export function getMonthName(month: number, year: number): string {
  const date = new Date(year, month, 1)
  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date)
  return monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year
}

// Categories
export const CATEGORIES = [
  { id: 'comida', label: 'Comida', emoji: '🍔' },
  { id: 'vivienda', label: 'Vivienda', emoji: '🏠' },
  { id: 'servicios', label: 'Servicios', emoji: '💡' },
  { id: 'entretenimiento', label: 'Entret.', emoji: '🎬' },
  { id: 'deudas', label: 'Deudas', emoji: '💳' },
  { id: 'salud', label: 'Salud', emoji: '💊' },
  { id: 'transporte', label: 'Transp.', emoji: '🚗' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
]

export function getCategoryEmoji(categoryId: string): string {
  const cat = CATEGORIES.find((c) => c.id === categoryId)
  return cat?.emoji || '📦'
}

export function getCategoryLabel(categoryId: string): string {
  const cat = CATEGORIES.find((c) => c.id === categoryId)
  return cat?.label || categoryId
}
