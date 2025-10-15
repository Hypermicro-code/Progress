/* ==== [BLOCK: CSV helpers] BEGIN ==== */
import type { Aktivitet } from "@/types"

const headers: (keyof Aktivitet)[] = [
  "id","navn","start","slutt","varighet","avhengighet","ansvarlig","status"
]

const csvEscape = (v: unknown) => {
  const s = v ?? ""
  const str = typeof s === "string" ? s : String(s)
  if (/[;\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}
/* ==== [BLOCK: CSV helpers] END ==== */

/* ==== [BLOCK: Export JSON] BEGIN ==== */
export function exportJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
/* ==== [BLOCK: Export JSON] END ==== */

/* ==== [BLOCK: Export CSV] BEGIN ==== */
export function exportCSV(filename: string, rows: Aktivitet[]) {
  const lines: string[] = []
  lines.push(headers.join(";"))
  for (const r of rows) {
    const cols = headers.map(h => csvEscape((r as any)[h] ?? ""))
    lines.push(cols.join(";"))
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
/* ==== [BLOCK: Export CSV] END ==== */
