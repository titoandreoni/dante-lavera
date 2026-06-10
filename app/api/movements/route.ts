import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ data: [], error: 'Supabase no configurado' })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
      .from('movements')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (month && year) {
      const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`
      const endMonth = parseInt(month) + 2
      const endYear = endMonth > 12 ? parseInt(year) + 1 : parseInt(year)
      const endMonthNum = endMonth > 12 ? 1 : endMonth
      const endDate = `${endYear}-${String(endMonthNum).padStart(2, '0')}-01`

      query = query
        .gte('date', startDate)
        .lt('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ data: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('GET movements error:', error)
    return NextResponse.json({ data: [], error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { data: null, error: 'Supabase no configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { user_name, type, amount, category, description, date } = body

    if (!user_name || !type || !amount) {
      return NextResponse.json(
        { data: null, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('movements')
      .insert([{
        user_name,
        type,
        amount: parseFloat(amount),
        category: category || null,
        description: description || null,
        date: date || new Date().toISOString().split('T')[0],
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('POST movement error:', error)
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase no configurado' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('movements')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE movement error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
