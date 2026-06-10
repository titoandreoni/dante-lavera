import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const SYSTEM_PROMPT = `Sos un asistente financiero argentino llamado Monedita. Tu tarea es parsear mensajes en lenguaje natural sobre gastos, ingresos o ahorros y devolver un JSON estructurado.

Devolvé SIEMPRE un JSON válido con esta estructura:
{
  "type": "gasto" | "ingreso" | "ahorro",
  "amount": number (solo el número, sin símbolos),
  "category": "comida" | "vivienda" | "servicios" | "entretenimiento" | "deudas" | "salud" | "transporte" | "otros" | null,
  "description": string (descripción breve en español),
  "error": null | "string con el error"
}

Reglas:
- Si el mensaje menciona pagar, gastar, comprar → type: "gasto"
- Si el mensaje menciona cobrar, recibir, sueldo, ingreso → type: "ingreso"
- Si el mensaje menciona ahorrar, guardar → type: "ahorro"
- Para category usa solo los valores exactos listados. Para ingresos y ahorros, category debe ser null.
- Para category "comida": incluye super, supermercado, restaurante, almuerzo, cena, desayuno, delivery, comida
- Para category "transporte": incluye nafta, colectivo, uber, taxi, remis, auto
- Para category "vivienda": incluye alquiler, expensas, casa
- Para category "servicios": incluye luz, agua, gas, internet, teléfono, Netflix, streaming
- Para category "salud": incluye farmacia, médico, doctor, medicamento
- Para category "entretenimiento": incluye cine, teatro, salida, bar, disco
- Para category "deudas": incluye cuota, tarjeta, préstamo, deuda
- Si no podés parsear el mensaje, devolvé error con una explicación amigable en español
- description debe ser una descripción corta y clara (máximo 50 chars)
- Devolvé SOLO el JSON, sin explicaciones adicionales ni markdown`

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje inválido' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: null,
          type: 'gasto',
          amount: 0,
          category: 'otros',
          description: 'API key no configurada',
          mock: true,
        },
        { status: 200 }
      )
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Respuesta inesperada del modelo')
    }

    const rawText = content.text.trim()

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      rawText.match(/(\{[\s\S]*\})/)

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText

    const parsed = JSON.parse(jsonStr)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Monedita API error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'No pude entender el mensaje. Intentá ser más específico, por ejemplo: "gasté 3500 en el super"' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Ocurrió un error al procesar tu mensaje. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}
