/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
// NB: v5 eksporterer default som CommonJS/UMD – hent den robust:
import * as JSSReact from "@jspreadsheet-ce/react"
import "jspreadsheet-ce/dist/jspreadsheet.css"
import "jsuites/dist/jsuites.css"
import type { Aktivitet } from "@/types"
/* ==== [BLOCK: Imports] END ==== */

/* ==== [BLOCK: Resolve React component] BEGIN ==== */
const JSpreadsheet: any = (JSSReact as any).default ?? (JSSReact as any)
/* ==== [BLOCK: Resolve React component] END ==== */

/* ==== [BLOCK: Props] BEGIN ==== */
export type AktivitetJSSProps = {
  rows: Aktivitet[]
  onRowsChange: (next: Aktivitet[]) => void
  filterText?: string
}
/* ==== [BLOCK: Props] END ==== */

/* ==== [BLOCK: Helpers] BEGIN ==== */
const COLUMNS: { title: string; width?: number; type?: string; readOnly?: boolean }[] = [
  { title: "#", width: 70, type: "text", readOnly: true },
  { title: "Navn", width: 240, type: "text" },
  { title: "Start", width: 120, type: "text" },
  { title: "Slutt", width: 120, type: "text" },
  { title: "Varighet", width: 110, type: "numeric" },
  { title: "Avhengighet", width: 150, type: "text" },
  { title: "Ansvarlig", width: 150, type: "text" },
  { title: "Status", width: 150, type: "text" },
]

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
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetJSS({ rows, onRowsChange, filterText }: AktivitetJSSProps) {
  // Bruk any for instans i v5 – wrapperen eksporterer ikke TS-typen
  const jref = React.useRef<any>(null)

  // filtrert visning (enkel klientfilter)
  const visibleRows = React.useMemo(() => {
    const q = (filterText ?? "").toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      `${r.id} ${r.navn} ${r.start} ${r.slutt} ${r.varighet ?? ""} ${r.avhengighet ?? ""} ${r.ansvarlig ?? ""} ${r.status ?? ""}`
        .toLowerCase()
        .includes(q)
    )
  }, [rows, filterText])

  // sync fra props til grid (når rows endres utenfra)
  React.useEffect(() => {
    if (!jref.current) return
    // v5: setData finnes på instansen
    jref.current.setData(toMatrix(visibleRows))
  }, [visibleRows])

  const handleAfterChange = React.useCallback(
    (_instance: any, _cell: any, x: number, y: number, value: any) => {
      // mappe tilbake endring til rows (y er radindex i visibleRows)
      const globalRowIndex = rows.indexOf(visibleRows[y] ?? rows[y])
      if (globalRowIndex < 0) return

      const keyByCol = ["id", "navn", "start", "slutt", "varighet", "avhengighet", "ansvarlig", "status"] as const
      const key = keyByCol[x]!
      const next = [...rows]
      const row = { ...(next[globalRowIndex] ?? { id: String(globalRowIndex + 1) }) }
      ;(row as any)[key] = key === "varighet"
        ? (value === "" ? undefined : Number(String(value).replace(",", ".")))
        : value
      next[globalRowIndex] = row
      onRowsChange(next)
    },
    [rows, visibleRows, onRowsChange]
  )

  const handleInsertRow = React.useCallback(
    (_instance: any, rowNumber: number, amount: number) => {
      const next = [...rows]
      for (let i = 0; i < amount; i++) {
        next.splice(rowNumber, 0, {
          id: "", navn: "", start: "", slutt: "", varighet: undefined, avhengighet: "", ansvarlig: "", status: ""
        })
      }
      for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
      onRowsChange(next)
    },
    [rows, onRowsChange]
  )

  const handleDeleteRow = React.useCallback(
    (_instance: any, rowNumber: number, amount: number) => {
      const next = rows.filter((_, i) => i < rowNumber || i >= rowNumber + amount)
      for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
      onRowsChange(next)
    },
    [rows, onRowsChange]
  )

  return (
    <div>
      <JSpreadsheet
        ref={jref}
        options={{
          data: toMatrix(visibleRows),
          columns: COLUMNS,
          columnDrag: true,
          columnSorting: true,
          allowInsertColumn: false,
          allowDeleteColumn: false,
          allowManualInsertRow: true,
          allowManualDeleteRow: true,
          // Kopi/lim er innebygd; kontekstmeny tilpasset
          contextMenu: (obj: any, x: number, y: number, _e: MouseEvent, items: any[]) => {
            const custom: any[] = [
              { title: "Ny rad over", onclick: () => obj.insertRow(1, y, 1) },
              { title: "Ny rad under", onclick: () => obj.insertRow(1, y + 1, 1) },
              { type: "line" },
              { title: "Slett rad", onclick: () => obj.deleteRow(y, 1) },
              { type: "line" },
              { title: "Fyll ned (kopier øverste verdi)", onclick: () => {
                  const sel = obj.getSelectedRows(true)
                  if (!sel?.length) return
                  const [r0, r1] = sel[0]
                  for (let r = r0 + 1; r <= r1; r++) {
                    for (let c = obj.selectedCell[0]; c <= obj.selectedCell[2]; c++) {
                      obj.setValueFromCoords(c, r, obj.getValueFromCoords(obj.selectedCell[0], r0))
                    }
                  }
                }
              }
            ]
            return [...custom, { type: "line" }, ...items]
          },
          // Stram opp UX
          defaultColWidth: 120,
          tableOverflow: true,
          tableHeight: "560px",
          wordWrap: false,
          freezeColumns: 1,
          // Events
          onchange: handleAfterChange,
          oninsertrow: handleInsertRow,
          ondeleterow: handleDeleteRow,
        }}
      />
    </div>
  )
}
/* ==== [BLOCK: Component] END ==== */
