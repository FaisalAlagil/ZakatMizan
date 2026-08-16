'use client'

import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { CURRENCIES } from '@/lib/currency'

const find = (code: string) => CURRENCIES.find((c) => c.code === code)

/**
 * A real listbox rather than a grid of tiles: each row reads symbol, code and
 * full name, so a currency you do not recognise by code is still identifiable.
 * Radix handles keyboard navigation, typeahead, focus and positioning.
 */
export function CurrencySelect({
  value,
  onChange,
  size = 'md',
}: {
  value: string
  onChange: (code: string) => void
  size?: 'sm' | 'md'
}) {
  const current = find(value)
  const trigger =
    size === 'sm' ? 'gap-1.5 px-2.5 py-1.5 text-xs' : 'gap-2 px-3.5 py-2 text-sm'

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label="Currency"
        className={`inline-flex items-center rounded-full border border-hair bg-paper font-medium text-ink transition-colors hover:border-ink-soft/35 data-[state=open]:border-ink-soft/40 ${trigger}`}
      >
        <span className="text-mute">{current?.symbol}</span>
        <span>{value}</span>
        <Select.Icon>
          <ChevronDown size={14} className="text-mute transition-transform duration-200" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-h-[min(22rem,60vh)] w-[17rem] overflow-hidden rounded-2xl border border-hair bg-paper shadow-[0_18px_44px_-16px_rgb(0_0_0/0.28)] data-[state=closed]:animate-[pop-out_120ms_ease-in] data-[state=open]:animate-[pop-in_170ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <Select.Viewport className="p-1.5">
            {CURRENCIES.map((c) => (
              <Select.Item
                key={c.code}
                value={c.code}
                className="flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-canvas data-[state=checked]:bg-canvas"
              >
                <span className="w-6 shrink-0 text-center text-base leading-none text-ink">{c.symbol}</span>
                <Select.ItemText>
                  <span className="font-medium text-ink">{c.code}</span>
                </Select.ItemText>
                <span className="flex-1 truncate text-xs text-mute">{c.name}</span>
                <Select.ItemIndicator>
                  <Check size={15} className="shrink-0 text-halal" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
