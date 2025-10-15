/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
// CSS lastes gjerne via CDN i index.html (jsuites + jspreadsheet v5)
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

function factoryFromWindow(): ((el: HTMLElement, opts: any) => any) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.jspreadsheet || w.jexcel || w.Jspreadsheet || null
}
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetJSS({ rows, onRowsChange, filterText }: AktivitetJSSProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const workbookRef = React.useRef<any | null>(null)  // v5 workbook
  const worksheetRef = React.useRef<any | null>(null) // v5 worksheet (første ark)

  const [status, setStatus] = React.useState<"idle"|"loading"|"ok"|"error">("idle")
  const [message, setMessage] = React.useState<string>("")
  const [showFallback, setShowFallback] = React.useState(true)

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

  /* ==== [BLOCK: init grid – v5 workbook/worksheets] BEGIN ==== */
  React.useEffect(() => {
    let cancelled = false
    const el = containerRef.current
    if (!el || workbookRef.current) return

    const start = async () => {
      setStatus("loading"); setMessage("Starter regneark…")

      try {
        // 1) Prøv via window (CDN)
        let factory = factoryFromWindow()

        // 2) Fallback: dynamisk import
        if (!factory) {
          const mod = await import("jspreadsheet-ce")
          if (cancelled) return
          const m: any = mod
          factory =
            (typeof m?.default?.jspreadsheet === "function" && m.default.jspreadsheet) ||
            (typeof m?.jspreadsheet === "function" && m.jspreadsheet) ||
            (typeof m?.default?.jexcel === "function" && m.default.jexcel) ||
            (typeof m?.jexcel === "function" && m.jexcel) ||
            (typeof m?.default === "function" && m.default) ||
            factoryFromWindow()
        }
        if (cancelled) return
        if (!factory) throw new Error("Fant ikke jspreadsheet (v5) via CDN/import.")

        // v5 krever workbook-konfig med worksheets[]
        el.innerHTML = ""
        const workbook = factory(el, {
          worksheets: [
            {
              data: visibleMatrix,
              columns: COLS as any,
              // UX/layout
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

              // === Events på worksheet-nivå i v5 ===
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
                ]
                return [...custom, { type: "line" }, ...items]
              },
            },
          ],
          // Slå av tabs/toolbar (vi styrer via vår UI)
          tabs: false,
          toolbar: false,
        })

        // Hent første worksheet (v5)
        const worksheet = (workbook?.worksheets?.[0]) ?? (workbook?.[0]) ?? null
        workbookRef.current = workbook
        worksheetRef.current = worksheet

        // Verifiser at DOM faktisk ble bygget før vi skjuler fallback
        requestAnimationFrame(() => {
          if (cancelled) return
          const hasNodes = el.childNodes.length > 0
          const rect = el.getBoundingClientRect()
          const painted = hasNodes && rect.height > 100 && rect.width > 100
          if (painted) {
            setStatus("ok"); setMessage(""); setShowFallback(false)
          } else {
            setStatus("error"); setMessage("Grid init startet, men ingenting ble rendret. Viser fallback.")
            setShowFallback(true)
            console.warn("[Progress] v5 grid ikke synlig etter init (nodes:", hasNodes, "size:", rect.width, rect.height, ")")
          }
        })
      } catch (e: any) {
        setStatus("error"); setMessage(e?.message || String(e)); setShowFallback(true)
        console.error("[Progress] jspreadsheet v5 init feilet:", e)
      }
    }

    start()
    return () => {
      try { workbookRef.current?.destroy?.() } catch {}
      workbookRef.current = null
      worksheetRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* ==== [BLOCK: init grid – v5 workbook/worksheets] END ==== */

  // Oppdater data når filter/rows endres (etter init)
  React.useEffect(() => {
    const ws = worksheetRef.current
    if (ws?.setData) ws.setData(visibleMatrix)
  }, [visibleMatrix])

  /* ==== [BLOCK: UI] BEGIN ==== */
  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize:12, color:"#6b7280", margin:"0 0 6px 2px" }}>
        {status === "loading" && "Laster regneark…"}
        {status === "ok" && "Regneark klart"}
        {status === "error" && `Regneark-feil: ${message}`}
      </div>

      {showFallback && (
        <div style={{
          border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background:"#fff",
          padding: 8, marginBottom: 8
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth: 720 }}>
              <thead>
                <tr>
                  {COLS.map(c => (
                    <th key={c.title} style={{ textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #e5e7eb", fontWeight:600 }}>{c.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toMatrix(rows).slice(0, 20).map((r, idx) => (
                  <tr key={idx}>
                    {r.map((v, i) => (
                      <td key={i} style={{ padding:"6px 8px", borderBottom:"1px solid #f3f4f6", color:"#111827" }}>
                        {String(v ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={COLS.length} style={{ padding:12, color:"#6b7280" }}>Ingen rader</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          minHeight: 560,
          width: "100%",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          display: showFallback ? "none" : "block"
        }}
      />
    </div>
  )
  /* ==== [BLOCK: UI] END ==== */
}
/* ==== [BLOCK: Component] END ==== */
