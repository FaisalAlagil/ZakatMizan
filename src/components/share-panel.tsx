'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ClipboardCopy, Download, FileText, Trash2, Upload } from 'lucide-react'
import { buildSummary, download } from '@/lib/export'
import { useStore } from '@/lib/store'
import { useZakat } from '@/lib/use-zakat'
import { Button, Card, Eyebrow } from '@/components/ui'

export function SharePanel() {
  const store = useStore()
  const router = useRouter()
  const { result } = useZakat()
  const fileInput = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const today = new Date().toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })
  const stamp = new Date().toISOString().slice(0, 10)

  const summary = () =>
    buildSummary({
      result,
      assets: store.assets,
      liabilities: store.liabilities,
      transactions: store.transactions,
      today,
    })

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary())
      setCopied(true)
      setStatus(null)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard is blocked in some browsers, so fall back to the visible text.
      setPreview(true)
      setStatus('Your browser blocked the clipboard. Select the text below and copy it.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-xl text-ink">Share your result</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          A readable summary with your figures, the reasoning and the sources. Send it to someone, keep it as a
          record, or paste it into a chatbot to ask questions about it.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button onClick={copy} className="justify-center">
            {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
            {copied ? 'Copied' : 'Copy as text'}
          </Button>
          <Button
            variant="quiet"
            className="justify-center"
            onClick={() => download(`zakat-summary-${stamp}.md`, summary(), 'text/markdown')}
          >
            <Download size={15} /> Download
          </Button>
          <Button variant="quiet" className="justify-center" onClick={() => setPreview((v) => !v)}>
            <FileText size={15} /> {preview ? 'Hide' : 'Preview'}
          </Button>
        </div>

        {preview && (
          <Card className="mt-3 p-4">
            <textarea
              readOnly
              value={summary()}
              rows={14}
              onFocus={(e) => e.currentTarget.select()}
              className="tnum w-full resize-y bg-transparent font-mono text-xs leading-relaxed text-ink-soft outline-none"
            />
          </Card>
        )}
      </div>

      <div className="border-t border-hair pt-6">
        <Eyebrow>Backup</Eyebrow>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Everything lives in this browser. Save a backup file to move to another device, or restore one you
          saved earlier.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="quiet"
            onClick={() =>
              download(`mizan-backup-${stamp}.json`, JSON.stringify(store, null, 2), 'application/json')
            }
          >
            <Download size={15} /> Save backup
          </Button>
          <Button variant="quiet" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> Restore backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const ok = store.importState(await file.text())
              setStatus(ok ? 'Backup restored.' : 'That file could not be read as a Mīzān backup.')
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {status && <p className="text-sm text-ink-soft">{status}</p>}

      <div className="border-t border-hair pt-6">
        <Eyebrow>Start over</Eyebrow>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Clears everything on this device and takes you back to the beginning. Save a backup first if you want
          to keep what you have entered.
        </p>
        <Button
          variant="quiet"
          className="mt-4 border-haram/40 text-haram hover:border-haram/60 hover:bg-haram/5"
          onClick={() => {
            if (!confirm('This clears every entry on this device and starts you from scratch. Continue?')) return
            store.reset()
            router.replace('/setup')
          }}
        >
          <Trash2 size={15} /> Clear everything and start over
        </Button>
      </div>
    </div>
  )
}
