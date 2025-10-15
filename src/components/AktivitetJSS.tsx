/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
import jspreadsheet from "jspreadsheet-ce"
import "jspreadsheet-ce/dist/jspreadsheet.css"
import "jsuites/dist/jsuites.css"
import type { Aktivitet } from "@/types"
/* ==== [BLOCK: Imports] END ==== */

/* ==== [BLOCK: Props] BEGIN ==== */
export type AktivitetJSSProps = {
  rows: Aktivitet[]
  onRowsChange: (next: Aktivitet[]) => void
  filterText?: string
}
/* ==== [BLOCK: Props] END ==== */

/* ==== [BLOCK: Helpers] BEGIN ==== */
const COLS = [
  { title: "#", width: 70, type: "text", readOnly: true },
  { title: "Navn", width: 240, type: "text" },
  { title: "Start", width: 120, type: "text" },
  { title: "Slutt", width: 120, type: "text" },
  { title: "Varighet", width: 110, type: "numeric" },
  { title: "Avhengighet", width: 150, type: "text" },
  { title: "Ansvarlig", width: 150, type: "text" },
  { title: "Status", width: 150, type: "text" },
] as const

const KEY_BY_COL = ["id","navn","start","slutt","varighet","avhengighet","ansvarlig","status"] as const

const toMatrix = (rows: Aktivitet[]) =>
  rows.map(r => [
    r.id ?? "",
    r.navn ?? "",
    r.start ?? "",
    r.slutt ?? "",
    r.varighet ?? "",
    r.avhengighet ?? "",
    r.ansvarlig ?? "",
    r.status ?? "",
  ])

const numberOrEmpty = (v: unknown) => {
  const s = String(v ?? "").trim()
  if (!s) return undefined
  const n = Number(String(s).replace(",", "."))
  return Number.isFinite(n) ? n : undefined
}
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetJSS({ rows, onRowsChange, filterText }: AktivitetJSSProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [sheet, setSheet] = React.useState<any | null>(null)

  // Synlig matrise + mapping synlig→original
  const { visibleMatrix, visibleToMaster } = React.useMemo(() => {
    const q = (filterText ?? "").toLowerCase()
    if (!q) return { visibleMatrix: toMatrix(rows), visibleToMaster: rows.map((_, i) => i) }
    const map: number[] = []
    const filtered: Aktivitet[] = []
    rows.forEach((r, i) => {
      const hay = `${r.id} ${r.navn ?? ""} ${r.start ?? ""} ${r.slutt ?? ""} ${r.varighet ?? ""} ${r.avhengighet ?? ""} ${r.ansvarlig ?? ""} ${r.status ?? ""}`.toLowerCase()
      if (hay.includes(q)) { filtered.push(r); map.push(i) }
    })
    return { visibleMatrix: toMatrix(filtered), visibleToMaster: map }
  }, [rows, filterText])

  // Initier jspreadsheet én gang
  React.useEffect(() => {
    if (!containerRef.current || sheet) return
    // Rydd eventuell gammel DOM (ved hot-reload/StrictMode)
    containerRef.current.innerHTML = ""

    const instance = jspreadsheet(containerRef.current, {
      data: visibleMatrix,
      columns: COLS as any,
      defaultColWidth: 120,
      tableOverflow: true,
      tableHeight: "560px",
      wordWrap: false,
      freezeColumns: 1,
      columnDrag: true,
      columnSorting: true,
      allowInsertColumn: false,
      allowDeleteColumn: false,
      allowManualInsertRow: true,
      allowManualDeleteRow: true,

      // === Events ===
      onchange: (_ws: any, _cell: any, x: number, y: number, value: any) => {
        const masterRow = visibleToMaster[y] ?? y
        if (masterRow == null) return
        const key = KEY_BY_COL[x]!
        const next = [...rows]
        const base = next[masterRow] ?? { id: String(masterRow + 1), navn: "", start: "", slutt: "" }
        next[masterRow] = {
          ...base,
          [key]: key === "varighet" ? numberOrEmpty(value) : String(value ?? ""),
        }
        for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
        onRowsChange(next)
      },

      oninsertrow: (_ws: any, vRow: number, amount: number) => {
        const mRow = visibleToMaster[vRow] ?? vRow
        const next = [...rows]
        for (let i = 0; i < amount; i++) {
          next.splice(mRow, 0, { id: "", navn: "", start: "", slutt: "", varighet: undefined, avhengighet: "", ansvarlig: "", status: "" })
        }
        for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
        onRowsChange(next)
      },

      ondeleterow: (_ws: any, vRow: number, amount: number) => {
        const mRow = visibleToMaster[vRow] ?? vRow
        const next = rows.filter((_, i) => i < mRow || i >= mRow + amount)
        for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
        onRowsChange(next)
      },

      contextMenu: (ws: any, x: number, y: number, _e: MouseEvent, items: any[]) => {
        const custom: any[] = [
          { title: "Ny rad over", onclick: () => ws.insertRow(1, y, 1) },
          { title: "Ny rad under", onclick: () => ws.insertRow(1, y + 1, 1) },
          { type: "line" },
          { title: "Slett rad", onclick: () => ws.deleteRow(y, 1) },
          { type: "line" },
          {
            title: "Fyll ned (kopier øverste verdi)",
            onclick: () => {
              const sel = ws.getSelectedRows(true)
              if (!sel?.length) return
              const [r0, r1] = sel[0]
              for (let r = r0 + 1; r <= r1; r++) {
                for (let c = ws.selectedCell[0]; c <= ws.selectedCell[2]; c++) {
                  ws.setValueFromCoords(c, r, ws.getValueFromCoords(ws.selectedCell[0], r0))
                }
              }
            }
          }
        ]
        return [...custom, { type: "line" }, ...items]
      },
    })

    setSheet(instance)

    return () => {
      try { instance.destroy?.() } catch {}
      setSheet(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, sheet])

  // Oppdater data når filter/rows endres (etter init)
  React.useEffect(() => {
    if (!sheet?.setData) return
    sheet.setData(visibleMatrix)
  }, [sheet, visibleMatrix])

  return <div ref={containerRef} />
}
/* ==== [BLOCK: Component] END ==== */
