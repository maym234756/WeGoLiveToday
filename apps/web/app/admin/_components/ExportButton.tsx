'use client'

type Row = Record<string, string | number | boolean | null | undefined>

function toCsv(rows: Row[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v ?? ''
    const str = String(s)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
  ]
  return lines.join('\n')
}

export default function ExportButton({ filename = 'export.csv', rows }: { filename?: string; rows: Row[] }) {
  return (
    <button
      type="button"
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }}
      className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
      title="Download CSV"
      aria-label="Download CSV"
    >
      Export CSV
    </button>
  )
}
