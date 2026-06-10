'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/useUser'
import BottomNav from '@/components/BottomNav'
import { supabase, formatARS, getCategoryEmoji, getCategoryLabel } from '@/lib/supabase'

interface ParsedMovement {
  type: 'gasto' | 'ingreso' | 'ahorro'
  amount: number
  category: string | null
  description: string
  error: string | null
}

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  parsed?: ParsedMovement
  confirmed?: boolean
  timestamp: Date
}

export default function DinerilloPage() {
  const router = useRouter()
  const { userName, isLoading } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoading && !userName) {
      router.replace('/login')
    }
  }, [isLoading, userName, router])

  useEffect(() => {
    if (!isLoading && userName && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          text: `¡Hola ${userName}! 👋 Soy Dinerillo, tu asistente financiero. Contame qué gastaste o qué ingreso tuviste, y yo lo registro por vos.\n\nPor ejemplo:\n• "gasté 3500 en el super"\n• "cobré el sueldo, 150000"\n• "pagué la factura de luz 8900"`,
          timestamp: new Date(),
        },
      ])
    }
  }, [isLoading, userName, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/dinerillo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      })

      const data = await response.json()

      if (data.error) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: `No pude procesar eso. ${data.error}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      } else {
        const typeLabel =
          data.type === 'gasto' ? 'gasto' : data.type === 'ingreso' ? 'ingreso' : 'ahorro'
        const emoji =
          data.type === 'ingreso' ? '💰' : data.type === 'ahorro' ? '🏦' : getCategoryEmoji(data.category || 'otros')

        let confirmText = `Entendí:\n${emoji} ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}: ${formatARS(data.amount)}`
        if (data.category) confirmText += `\n📁 ${getCategoryLabel(data.category)}`
        if (data.description) confirmText += `\n📝 ${data.description}`
        confirmText += '\n\n¿Confirmo?'

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: confirmText,
          parsed: data as ParsedMovement,
          confirmed: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      }
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Tuve un problema de conexión. Intentá de nuevo.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirm = async (messageId: string, parsed: ParsedMovement) => {
    if (!userName) return
    setSavingId(messageId)

    try {
      const { error } = await supabase.from('movements').insert([{
        user_name: userName,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description || null,
        date: new Date().toISOString().split('T')[0],
      }])

      if (error) throw error

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, confirmed: true } : m
        )
      )

      const successMsg: Message = {
        id: Date.now().toString(),
        role: 'ai',
        text: `✅ ¡Listo! ${getCategoryEmoji(parsed.category || 'otros')} ${formatARS(parsed.amount)} registrado como ${parsed.type}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, successMsg])
    } catch (err) {
      console.error('Error saving from Dinerillo:', err)
      const errMsg: Message = {
        id: Date.now().toString(),
        role: 'ai',
        text: 'No pude guardar el movimiento. Verificá que Supabase esté configurado.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setSavingId(null)
    }
  }

  const handleCancel = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, confirmed: true } : m
      )
    )
    const cancelMsg: Message = {
      id: Date.now().toString(),
      role: 'ai',
      text: 'Cancelado. ¿Querés registrar otra cosa?',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMsg])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00e676]/10 border border-[#00e676]/20 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Dinerillo</h1>
            <p className="text-[#555555] text-xs">Tu asistente financiero con IA</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: '120px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} px-4 py-2.5`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {/* Confirmation buttons */}
              {msg.role === 'ai' && msg.parsed && !msg.confirmed && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleConfirm(msg.id, msg.parsed!)}
                    disabled={savingId === msg.id}
                    className="flex-1 py-2 rounded-xl bg-[#00e676] text-[#0a0a0a] text-sm font-semibold
                               active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {savingId === msg.id ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                        Guardando
                      </span>
                    ) : (
                      '✓ Confirmar'
                    )}
                  </button>
                  <button
                    onClick={() => handleCancel(msg.id)}
                    disabled={savingId === msg.id}
                    className="px-4 py-2 rounded-xl bg-[#2a2a2a] text-[#888888] text-sm font-medium
                               active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bubble-ai px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#555555] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#555555] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#555555] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5
                       text-white placeholder-[#333333] text-sm
                       focus:outline-none focus:border-[#00e676]/40 transition-colors"
            placeholder="ej: gasté 3500 en el super..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#00e676] flex items-center justify-center
                       disabled:opacity-40 active:scale-90 transition-all duration-150"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
