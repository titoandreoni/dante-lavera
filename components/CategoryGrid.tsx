'use client'

import { CATEGORIES } from '@/lib/supabase'

interface CategoryGridProps {
  selected: string
  onSelect: (categoryId: string) => void
}

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`category-item ${selected === cat.id ? 'selected' : ''}`}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  )
}
