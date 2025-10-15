/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
// Merk: CSS lastes nå også via CDN i index.html.
// Behold linjene under hvis du ønsker lokal CSS også – det skader ikke.
// import "jspreadsheet-ce/dist/jspreadsheet.css"
// import "jsuites/dist/jsuites.css"
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

function resolveFactoryFromWindow(): ((el: HTMLElement, opts: any) => any) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.jspreadsheet || w.jexcel || w.Jspreadsheet || null
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

  /* ==== [BLOCK: init grid] BEGIN ==== */
  React.useEffect(() => {
    let cancelled = false
    const el = containerRef.current
    if (!el || sheetRef.current) return

    const start = async () => {
      try {
        // 1) Prøv fra window (CDN)
        let factory = resolveFactoryFromWindow()

        // 2) Fallback: dynamisk import
        if (!factory) {
          const mod = await import("jspreadsheet-ce")
          const cand = [
            (mod as any)?.default?.jspreadsheet,
            (mod as any)?.jspreadsheet,
            (mod as any)?.default?.jexcel,
            (mod as any)?.jexcel,
            typeof (mod as any)?.default === "function" ? (mod as any).default : null,
          ].find(f => typeof f === "function")
          factory = (cand as any) ?? resolveFactoryFromWindow()
        }
        if (cancelled) return
        if (!factory) throw new Error("Fant ikke jspreadsheet (hverken via CDN eller import).")

        el.innerHTML = ""
        const inst = factory(el, {
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
        setError(e?.message || String(e))
        console.error("[Progress] jspreadsheet init feilet:", e)
      }
    }
    start()

    return () => { cancelled = true; try { sheetRef.current?.destroy?.() } catch {} ; sheetRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* ==== [BLOCK: init grid] END ==== */

  // Oppdater data når filter/rows endres (etter init)
  React.useEffect(() => {
    if (ready && sheetRef.current?.setData) {
      sheetRef.current.setData(visibleMatrix)
    }
  }, [ready, visibleMatrix])

  return (
    <div style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background:"#fff" }}>
      {error && (
        <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", color:"#b91c1c", background:"#fff" }}>
          <div>
            <div style={{ fontWeight:700, marginBottom:8 }}>Kunne ikke starte tabellen</div>
            <div style={{ fontSize:14 }}>{error}</div>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: 560, width: "100%" }} />
    </div>
  )
}
/* ==== [BLOCK: Component] END ==== */
