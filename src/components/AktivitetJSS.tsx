/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
import { Spreadsheet, Worksheet } from "@jspreadsheet-ce/react"
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

const toRows = (matrix: (string | number)[][]): Aktivitet[] =>
  matrix.map((r, i) => ({
    id: String(r[0] ?? i + 1),
    navn: String(r[1] ?? ""),
    start: String(r[2] ?? ""),
    slutt: String(r[3] ?? ""),
    varighet: r[4] === "" || r[4] == null ? undefined : Number(String(r[4]).replace(",", ".")),
    avhengighet: String(r[5] ?? ""),
    ansvarlig: String(r[6] ?? ""),
    status: String(r[7] ?? ""),
  }))
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetJSS({ rows, onRowsChange, filterText }: AktivitetJSSProps) {
  const spreadsheetRef = React.useRef<any>(null)

  // Enkel klientfilter: vi filtrerer visningen, men tar vare på opprinnelig data
  const visibleData = React.useMemo(() => {
    const q = (filterText ?? "").toLowerCase()
    if (!q) return toMatrix(rows)
    const hits = rows.filter(r =>
      `${r.id} ${r.navn ?? ""} ${r.start ?? ""} ${r.slutt ?? ""} ${r.varighet ?? ""} ${r.avhengighet ?? ""} ${r.ansvarlig ?? ""} ${r.status ?? ""}`
        .toLowerCase()
        .includes(q)
    )
    return toMatrix(hits)
  }, [rows, filterText])

  // Når brukeren endrer celler i arket → oppdater React-state
  const handleAfterChanges = React.useCallback(async (_worksheet: any, _records: any[]) => {
    try {
      // Hent hele datasettet fra aktivt ark og synk til rows
      const ws = _worksheet // worksheet-objekt
      const matrix: (string | number)[][] = ws.getData()
      const next = toRows(matrix)
      // re-id for enkelhet (kan erstattes av stabil ID-generator ved behov)
      for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
      onRowsChange(next)
    } catch {
      // Ignorer – bedre enn å kræsje UI
    }
  }, [onRowsChange])

  // Contextmeny: enkle radoperasjoner + fill nedover
  const contextMenu = React.useCallback((ws: any, x: number, y: number, _e: MouseEvent, items: any[]) => {
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
  }, [])

  return (
    <Spreadsheet
      ref={spreadsheetRef}
      // Viktig: lytt på "afterchanges" på spreadsheet/worksheet-nivå i v5
      onafterchanges={handleAfterChanges}
      // De fleste Excel-ting (multi-seleksjon, copy/paste) er innebygd
      // Tabs/toolbar er av – vi styrer via egen UI
      tabs={false}
      toolbar={false}
    >
      <Worksheet
        data={visibleData}
        columns={COLS as any}
        defaultColWidth={120}
        tableOverflow={true}
        tableHeight={"560px"}
        wordWrap={false}
        freezeColumns={1}
        columnDrag={true}
        columnSorting={true}
        allowInsertColumn={false}
        allowDeleteColumn={false}
        allowManualInsertRow={true}
        allowManualDeleteRow={true}
        contextMenu={contextMenu as any}
      />
    </Spreadsheet>
  )
}
/* ==== [BLOCK: Component] END ==== */
