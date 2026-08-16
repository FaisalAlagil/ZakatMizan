'use client'

import { useState } from 'react'
import { Plus, Trash2, Store } from 'lucide-react'
import { money } from './ui'

export type BusinessStockItem = {
  id: string
  name: string
  quantity: string
  unitValue: string
  totalValue: number
}

export function BusinessStockInput({
  value,
  onChangeValue,
  currency,
}: {
  value: string
  onChangeValue: (val: string) => void
  currency: string
}) {
  const [items, setItems] = useState<BusinessStockItem[]>([
    {
      id: 'stock-1',
      name: 'Merchandise / Trade Goods 1',
      quantity: '1',
      unitValue: value || '',
      totalValue: Number.parseFloat(value) || 0,
    },
  ])

  function updateItems(newItems: BusinessStockItem[]) {
    setItems(newItems)
    const sum = newItems.reduce((acc, it) => acc + (it.totalValue || 0), 0)
    onChangeValue(sum > 0 ? sum.toFixed(2).replace(/\.00$/, '') : '')
  }

  function addItem() {
    const nextIdx = items.length + 1
    const newItem: BusinessStockItem = {
      id: `stock-${Date.now()}`,
      name: `Inventory Item ${nextIdx}`,
      quantity: '1',
      unitValue: '',
      totalValue: 0,
    }
    updateItems([...items, newItem])
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      updateItems([{ ...items[0], unitValue: '', totalValue: 0 }])
      return
    }
    updateItems(items.filter((it) => it.id !== id))
  }

  function updateItem(id: string, patch: Partial<BusinessStockItem>) {
    const next = items.map((it) => {
      if (it.id !== id) return it
      const updated = { ...it, ...patch }
      const qty = Number.parseFloat(updated.quantity) || 1
      const unit = Number.parseFloat(updated.unitValue) || 0
      updated.totalValue = qty * unit
      return updated
    })
    updateItems(next)
  }

  const totalStockValue = items.reduce((acc, it) => acc + (it.totalValue || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hair pb-2.5">
        <span className="text-xs font-medium text-ink flex items-center gap-1.5">
          <Store size={14} className="text-gold-ink" /> Inventory &amp; Trade Goods ({items.length})
        </span>
        <span className="text-[11px] text-mute">Valued at current resale price (Qimat al-Suq)</span>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex flex-col gap-2.5 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder={`e.g. Apparel inventory, Electronics, Raw materials ${idx + 1}`}
                className="text-xs font-semibold text-ink bg-transparent outline-none focus:underline w-full max-w-[70%] truncate"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.name}`}
                className="text-mute hover:text-haram p-1 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              {/* Quantity */}
              <div className="col-span-5 flex items-center border border-hair rounded-xl px-2.5 py-1.5 bg-canvas focus-within:border-deep">
                <span className="text-[11px] text-mute mr-1 font-medium">Qty:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, {
                      quantity: e.target.value.replace(/[^0-9.]/g, ''),
                    })
                  }
                  placeholder="1"
                  aria-label={`${item.name} quantity`}
                  className="tnum text-xs font-semibold text-ink bg-transparent outline-none w-full"
                />
              </div>

              {/* Unit Price / Resale Value */}
              <div className="col-span-7 flex items-center border border-hair rounded-xl px-2.5 py-1.5 bg-canvas focus-within:border-deep">
                <span className="text-xs text-mute mr-1 font-medium">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.unitValue}
                  onChange={(e) =>
                    updateItem(item.id, {
                      unitValue: e.target.value.replace(/[^0-9.]/g, ''),
                    })
                  }
                  placeholder="Price per unit"
                  aria-label={`${item.name} unit resale price`}
                  className="tnum text-xs font-semibold text-ink bg-transparent outline-none w-full"
                />
                <span className="text-[11px] text-mute ml-1 font-medium">{currency}</span>
              </div>
            </div>

            {item.totalValue > 0 && (
              <div className="flex items-center justify-between text-[11px] text-mute border-t border-hair/50 pt-1.5">
                <span className="truncate max-w-[60%]">
                  {item.quantity || '1'} × {money(Number.parseFloat(item.unitValue) || 0, currency, 2)}
                </span>
                <span className="font-semibold text-ink">
                  Total: {money(item.totalValue, currency, 2)}
                </span>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-hair py-2.5 text-xs font-medium text-ink-soft hover:border-ink-soft/40 hover:bg-paper transition-all"
        >
          <Plus size={14} /> Add Another Business Stock Item
        </button>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-hair bg-paper p-4 text-center space-y-1 shadow-sm">
        <div className="flex items-baseline justify-center gap-2">
          <span className="eyebrow text-mute">Total Business Stock:</span>
          <span className="display text-2xl font-semibold text-ink">
            {money(totalStockValue || Number.parseFloat(value) || 0, currency, 2)}
          </span>
        </div>
        <p className="text-[11px] text-ink-soft">
          Fully zakatable at 2.5% according to all 4 schools of Islamic jurisprudence.
        </p>
      </div>
    </div>
  )
}
