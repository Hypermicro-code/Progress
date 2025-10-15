/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
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

function resolveFactory(mod: any): ((el: HTMLElement, opts: any) => any) | null {
  const cands = [
    mod?.default?.jspreadsheet,
    mod?.jspreadsheet,
    mod?.default?.jexcel,
    mod?.jexcel,
    typeof mod?.default === "function" ? mod.default : null,
  ]
  for (const f of cands) if (typeof f === "function") return f
  return null
}
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetJSS({ rows, onRowsChange, filterText }: AktivitetJSSProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const sheetRef = React.useRef<any | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)

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

  // Init: last jspreadsheet-ce dynamisk og start instansen
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!containerRef.current || sheetRef.current) return
        // Dynamic import – robust for ESM/CJS
        const mod = await import("jspreadsheet-ce")
        if (cancelled) return
        const factory = resolveFactory(mod) || (typeof (window as any) !== "undefined" ? ((window as any).jspreadsheet || (window as any).jexcel) : null)
        if (!factory) throw new Error("Fant ikke jspreadsheet-fabrikk i modul eller window.")
        containerRef.current.innerHTML = ""
        const inst = factory(containerRef.current, {
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

          onchange: (_ws: any, _cell: any, x: number, y: number, value: any) => {
            const masterRow = visibleToMaster[y] ?? y
            if (masterRow == null) return
            const key = KEY_BY_COL[x]!
            const next = [...rows]
            const base = next[masterRow] ?? { id: String(masterRow + 1), navn: "", start: "", slutt: "" }
            next[masterRow] = { ...base, [key]: key === "varighet" ? numberOrEmpty(value) : String(value ?? "") }
            for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
            onRowsChange(next)
          },

          oninsertrow: (_ws: any, vRow: number, amount: number) => {
            const mRow = visibleToMaster[vRow] ?? vRow
            const next = [...rows]
            for (let i = 0; i < amount; i++) next.splice(mRow, 0, { id: "", navn: "", start: "", slutt: "", varighet: undefined, avhengighet: "", ansvarlig: "", status: "" })
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
        sheetRef.current = inst
        setError(null)
        setReady(true)
      } catch (e: any) {
        console.error("[Progress] jspreadsheet init feilet:", e)
        setError(e?.message || String(e))
      }
    })()
    return () => { cancelled = true; try { sheetRef.current?.destroy?.() } catch {} ; sheetRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Når data/filter endres etter init → oppdater visning
  React.useEffect(() => {
    if (ready && sheetRef.current?.setData) {
      sheetRef.current.setData(visibleMatrix)
    }
  }, [ready, visibleMatrix])

  return (
    <div style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      {error && (
        <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", color:"#b91c1c", background:"#fff" }}>
          <div>
            <div style={{ fontWeight:700, marginBottom:8 }}>Kunne ikke starte tabellen</div>
            <div style={{ fontSize:14 }}>{error}</div>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: 560, width: "100%", background: "#fff" }} />
    </div>
  )
}
/* ==== [BLOCK: Component] END ==== */
