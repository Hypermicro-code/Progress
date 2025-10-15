/* ==== [BLOCK: Imports] BEGIN ==== */
import React from "react"
import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  EditableGridCell,
  CompactSelection,
  Rectangle,
} from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"
import type { Aktivitet } from "@/types"
/* ==== [BLOCK: Imports] END ==== */

/* ==== [BLOCK: Props] BEGIN ==== */
export type AktivitetGlideGridProps = {
  rows: Aktivitet[]
  onRowsChange: (next: Aktivitet[]) => void
}
/* ==== [BLOCK: Props] END ==== */

/* ==== [BLOCK: Helpers] BEGIN ==== */
const cols: { key: keyof Aktivitet; name: string; width?: number }[] = [
  { key: "id", name: "#" , width: 80 },
  { key: "navn", name: "Navn", width: 240 },
  { key: "start", name: "Start", width: 120 },
  { key: "slutt", name: "Slutt", width: 120 },
  { key: "varighet", name: "Varighet", width: 110 },
  { key: "avhengighet", name: "Avhengighet", width: 150 },
  { key: "ansvarlig", name: "Ansvarlig", width: 150 },
  { key: "status", name: "Status", width: 150 },
]

const numberOrEmpty = (v: unknown) => {
  const s = String(v ?? "").trim()
  if (!s) return undefined
  const n = Number(s.replace(",", "."))
  return Number.isFinite(n) ? n : undefined
}
/* ==== [BLOCK: Helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetGlideGrid({ rows, onRowsChange }: AktivitetGlideGridProps) {
  const [selection, setSelection] = React.useState<{
    columns: CompactSelection
    rows: CompactSelection
    current?: Rectangle
  }>({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })

  const columns = React.useMemo<GridColumn[]>(
    () =>
      cols.map(c => ({
        id: String(c.key),
        title: c.name,
        width: c.width,
        grow: c.key === "navn" ? 1 : 0,
        themeOverride: c.key === "id" ? { textDark: "#6b7280" } : undefined,
      })),
    []
  )

  const getCellContent = React.useCallback(
    ([col, row]: Item): GridCell => {
      const r = rows[row]
      const key = cols[col].key
      const val = (r as any)?.[key]
      if (key === "varighet") {
        return {
          kind: GridCellKind.Number,
          displayData: val ?? "",
          data: typeof val === "number" ? val : undefined,
          allowOverlay: true,
        }
      }
      return {
        kind: GridCellKind.Text,
        displayData: val ?? "",
        data: val ?? "",
        allowOverlay: true,
      }
    },
    [rows]
  )

  const setCell = React.useCallback(
    (rowIndex: number, key: keyof Aktivitet, value: unknown) => {
      const id = rows[rowIndex]?.id ?? String(rowIndex + 1)
      const next = [...rows]
      const base: Aktivitet = next[rowIndex] ?? { id, navn: "", start: "", slutt: "" }
      next[rowIndex] = {
        ...base,
        [key]: key === "varighet" ? numberOrEmpty(value) : String(value ?? ""),
      }
      onRowsChange(next)
    },
    [rows, onRowsChange]
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [col, row] = cell
      const key = cols[col].key
      if (newValue.kind === GridCellKind.Text) setCell(row, key, newValue.data)
      else if (newValue.kind === GridCellKind.Number) setCell(row, key, newValue.data)
    },
    [setCell]
  )

  // Paste TSV inn i valgt område (range selection er innebygd i Glide)
  const onPaste = React.useCallback(
    async (target: Item, data: readonly (readonly (string | number)[])[]) => {
      const [startCol, startRow] = target
      const next = [...rows]
      let maxRow = startRow
      for (let r = 0; r < data.length; r++) {
        const outRow = startRow + r
        if (!next[outRow]) next[outRow] = { id: String(outRow + 1), navn: "", start: "", slutt: "" }
        const rowData = data[r]
        for (let c = 0; c < rowData.length; c++) {
          const outCol = startCol + c
          if (!cols[outCol]) continue
          const key = cols[outCol].key
          const val = rowData[c]
          ;(next[outRow] as any)[key] = key === "varighet" ? numberOrEmpty(val) : String(val ?? "")
        }
        maxRow = Math.max(maxRow, outRow)
      }
      onRowsChange(next)
      return true
    },
    [rows, onRowsChange]
  )

  // Fill down/right på Cmd/Ctrl+D/R
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC")
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return

      const rect = selection.current
      if (!rect) return
      const { x, y, width, height } = rect
      if (e.key.toLowerCase() === "d" && height > 1) {
        e.preventDefault()
        const sourceRow = y
        const next = [...rows]
        for (let r = y + 1; r < y + height; r++) {
          if (!next[r]) next[r] = { id: String(r + 1), navn: "", start: "", slutt: "" }
          for (let c = x; c < x + width; c++) {
            const key = cols[c].key
            ;(next[r] as any)[key] = (next[sourceRow] as any)[key]
          }
        }
        onRowsChange(next)
      }
      if (e.key.toLowerCase() === "r" && width > 1) {
        e.preventDefault()
        const next = [...rows]
        for (let r = y; r < y + height; r++) {
          if (!next[r]) next[r] = { id: String(r + 1), navn: "", start: "", slutt: "" }
          const srcKey = cols[x].key
          for (let c = x + 1; c < x + width; c++) {
            const key = cols[c].key
            ;(next[r] as any)[key] = (next[r] as any)[srcKey]
          }
        }
        onRowsChange(next)
      }
    },
    [selection, rows, onRowsChange]
  )

  const gridHeight = 560

  return (
    <div onKeyDown={onKeyDown}>
      <DataEditor
        columns={columns}
        getCellContent={getCellContent}
        rows={Math.max(rows.length, 50)}
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
        freezeColumns={1}
        onCellEdited={onCellEdited}
        onPaste={onPaste}
        onSelectionChange={(s) => setSelection(s)}
        // litt hyggelig standard
        getCellsForSelection={true}
        height={gridHeight}
      />
    </div>
  )
}
/* ==== [BLOCK: Component] END ==== */
