'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'

interface PendingItem {
  id: string
  description: string
  category: 'hogar' | 'super' | 'farmacia' | 'limpieza' | 'otros'
  completed: boolean
  completed_at: string | null
  added_by: string
  created_at: string
}

const CATEGORIES: { id: PendingItem['category']; label: string; emoji: string }[] = [
  { id: 'hogar', label: 'Hogar', emoji: '🏠' },
  { id: 'super', label: 'Super', emoji: '🛒' },
  { id: 'farmacia', label: 'Farmacia', emoji: '💊' },
  { id: 'limpieza', label: 'Limpieza', emoji: '🧹' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
]

function getCategoryEmoji(cat: string) {
  return CATEGORIES.find((c) => c.id === cat)?.emoji ?? '📦'
}

function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat
}

export default function PendientesPage() {
  const router = useRouter()
  const { userName, isLoading } = useUser()

  const [items, setItems] = useState<PendingItem[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<PendingItem['category']>('hogar')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [clearingCompleted, setClearingCompleted] = useState(false)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  const fetchItems = useCallback(async () => {
    setLoadingData(true)
    try {
      const { data, error: dbError } = await supabase
        .from('pending_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setItems((data as PendingItem[]) || [])
    } catch (err) {
      console.error('Error fetching pending items:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (userName) fetchItems()
  }, [userName, fetchItems])

  const handleAdd = async () => {
    if (!description.trim()) {
      setError('Escribí una descripción')
      return
    }
    if (!userName) return

    setSaving(true)
    setError('')

    const tempId = `temp-${Date.now()}`
    const optimisticItem: PendingItem = {
      id: tempId,
      description: description.trim(),
      category,
      completed: false,
      completed_at: null,
      added_by: userName,
      created_at: new Date().toISOString(),
    }

    setItems((prev) => [optimisticItem, ...prev])
    setDescription('')
    setCategory('hogar')
    setShowForm(false)

    try {
      const { data, error: dbError } = await supabase
        .from('pending_items')
        .insert([{
          description: optimisticItem.description,
          category: optimisticItem.category,
          completed: false,
          added_by: optimisticItem.added_by,
        }])
        .select()
        .single()

      if (dbError) throw dbError
      setItems((prev) =>
        prev.map((item) => (item.id === tempId ? (data as PendingItem) : item))
      )
    } catch (err) {
      console.error('Error adding item:', err)
      setItems((prev) => prev.filter((item) => item.id !== tempId))
      setError('Error al guardar. Reintentá.')
      setShowForm(true)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleComplete = async (item: PendingItem) => {
    const nowCompleted = !item.completed

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null }
          : i
      )
    )

    try {
      const { error: dbError } = await supabase
        .from('pending_items')
        .update({
          completed: nowCompleted,
          completed_at: nowCompleted ? new Date().toISOString() : null,
        })
        .eq('id', item.id)

      if (dbError) throw dbError
    } catch (err) {
      console.error('Error toggling item:', err)
      // Revert
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, completed: item.completed, completed_at: item.completed_at } : i
        )
      )
    }
  }

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      const { error: dbError } = await supabase
        .from('pending_items')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError
    } catch (err) {
      console.error('Error deleting item:', err)
      await fetchItems()
    }
  }

  const handleClearCompleted = async () => {
    setClearingCompleted(true)
    const completedIds = items.filter((i) => i.completed).map((i) => i.id)
    setItems((prev) => prev.filter((i) => !i.completed))
    try {
      const { error: dbError } = await supabase
        .from('pending_items')
        .delete()
        .in('id', completedIds)

      if (dbError) throw dbError
    } catch (err) {
      console.error('Error clearing completed:', err)
      await fetchItems()
    } finally {
      setClearingCompleted(false)
    }
  }

  const pendingItems = items.filter((i) => !i.completed)
  const completedItems = items.filter((i) => i.completed)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] page-transition">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Pendientes</h1>
            <p className="text-[#555555] text-sm mt-1">
              {pendingItems.length === 0
                ? 'Todo al día'
                : `${pendingItems.length} ${pendingItems.length === 1 ? 'pendiente' : 'pendientes'}`}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError('') }}
            className="w-10 h-10 rounded-full bg-[#00e676] flex items-center justify-center active:scale-90 transition-transform"
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

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
            <h3 className="text-white font-semibold text-sm">Agregar pendiente</h3>

            <div>
              <input
                type="text"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3
                           text-white placeholder-[#333333] text-sm
                           focus:outline-none focus:border-[#444444] transition-colors"
                placeholder="¿Qué necesitás agregar?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                maxLength={120}
                autoFocus
              />
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${category === cat.id
                      ? 'bg-[#00e676]/10 border border-[#00e676] text-[#00e676]'
                      : 'bg-[#111111] border border-[#2a2a2a] text-[#888888]'
                    }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-3">
                <p className="text-[#ef4444] text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
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

      {/* Pending list */}
      <div className="px-4 py-3">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#00e676] rounded-full animate-spin" />
          </div>
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">✅</p>
            <p className="text-[#555555] text-base">Sin pendientes</p>
            <p className="text-[#333333] text-sm mt-1">Tocá + para agregar uno</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleComplete}
                onDelete={handleDelete}
              />
            ))}

            {pendingItems.length === 0 && completedItems.length > 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-[#555555] text-sm">Todo listo</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completed section */}
      {completedItems.length > 0 && (
        <div className="px-4 pb-3">
          {/* Section header */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#555555] text-sm font-medium">
                Completados ({completedItems.length})
              </span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {completedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggleComplete}
                  onDelete={handleDelete}
                />
              ))}

              <button
                onClick={handleClearCompleted}
                disabled={clearingCompleted}
                className="w-full mt-2 py-2.5 rounded-xl border border-[#2a2a2a] text-[#555555] text-sm font-medium
                           active:scale-95 transition-transform disabled:opacity-50"
              >
                {clearingCompleted ? 'Limpiando...' : 'Limpiar completados'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="h-24" />
      <BottomNav />
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: PendingItem
  onToggle: (item: PendingItem) => void
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(item.id)
  }

  return (
    <div
      className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 flex items-center gap-3
        transition-opacity duration-200 ${item.completed ? 'opacity-60' : 'opacity-100'}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item)}
        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                   transition-all duration-200 active:scale-90"
        style={{
          borderColor: item.completed ? '#00e676' : '#444444',
          backgroundColor: item.completed ? '#00e676' : 'transparent',
        }}
      >
        {item.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: item.completed ? '#555555' : '#ffffff',
            textDecoration: item.completed ? 'line-through' : 'none',
          }}
        >
          {item.description}
        </p>
        <p className="text-xs text-[#444444] mt-0.5">
          {item.added_by} · {getCategoryEmoji(item.category)} {getCategoryLabel(item.category)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center
                   active:scale-90 transition-transform disabled:opacity-50"
      >
        {deleting ? (
          <div className="w-3 h-3 border border-[#555555] border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </button>
    </div>
  )
}
