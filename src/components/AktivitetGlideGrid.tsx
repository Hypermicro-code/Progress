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
  filterText?: string
}
/* ==== [BLOCK: Props] END ==== */

/* ==== [BLOCK: Local types + helpers] BEGIN ==== */
const columnsSpec: { key: keyof Aktivitet; name: string; width?: number; grow?: number }[] = [
  { key: "id", name: "#", width: 84 },
  { key: "navn", name: "Navn", width: 240, grow: 1 },
  { key: "start", name: "Start", width: 120 },
  { key: "slutt", name: "Slutt", width: 120 },
  { key: "varighet", name: "Varighet", width: 110 },
  { key: "avhengighet", name: "Avhengighet", width: 150 },
  { key: "ansvarlig", name: "Ansvarlig", width: 150 },
  { key: "status", name: "Status", width: 150 },
]

const isMatch = (r: Aktivitet, q: string) => {
  if (!q) return true
  const hay = `${r.id} ${r.navn ?? ""} ${r.start ?? ""} ${r.slutt ?? ""} ${r.varighet ?? ""} ${r.avhengighet ?? ""} ${r.ansvarlig ?? ""} ${r.status ?? ""}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

const numberOrEmpty = (v: unknown) => {
  const s = String(v ?? "").trim()
  if (!s) return undefined
  const n = Number(s.replace(",", "."))
  return Number.isFinite(n) ? n : undefined
}
/* ==== [BLOCK: Local types + helpers] END ==== */

/* ==== [BLOCK: Component] BEGIN ==== */
export default function AktivitetGlideGrid({ rows, onRowsChange, filterText }: AktivitetGlideGridProps) {
  const [selection, setSelection] = React.useState<{
    columns: CompactSelection
    rows: CompactSelection
    current?: Rectangle
  }>({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })

  const visibleIndex = React.useMemo<number[]>(
    () => rows.map((_, i) => i).filter(i => isMatch(rows[i], filterText ?? "")),
    [rows, filterText]
  )

  const columns = React.useMemo<GridColumn[]>(
    () =>
      columnsSpec.map(c => ({
        id: String(c.key),
        title: c.name,
        width: c.width,
        grow: c.grow ?? 0,
        themeOverride: c.key === "id" ? { textDark: "#6b7280" } : undefined,
      })),
    []
  )

  const getCellContent = React.useCallback(
    ([col, vRow]: Item): GridCell => {
      const rowIndex = visibleIndex[vRow] ?? vRow
      const r = rows[rowIndex]
      const key = columnsSpec[col].key
      const val = (r as any)?.[key]
      if (key === "varighet") {
        return {
          kind: GridCellKind.Number,
          displayData: typeof val === "number" ? String(val) : (val ?? ""),
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
    [rows, visibleIndex]
  )

  const setCell = React.useCallback(
    (visibleRow: number, key: keyof Aktivitet, value: unknown) => {
      const masterRow = visibleIndex[visibleRow] ?? visibleRow
      const id = rows[masterRow]?.id ?? String(masterRow + 1)
      const next = [...rows]
      const base: Aktivitet = next[masterRow] ?? { id, navn: "", start: "", slutt: "" }
      next[masterRow] = {
        ...base,
        [key]: key === "varighet" ? numberOrEmpty(value) : String(value ?? ""),
      }
      onRowsChange(next)
    },
    [rows, visibleIndex, onRowsChange]
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [col, vRow] = cell
      const key = columnsSpec[col].key
      if (newValue.kind === GridCellKind.Text) setCell(vRow, key, newValue.data)
      else if (newValue.kind === GridCellKind.Number) setCell(vRow, key, newValue.data)
    },
    [setCell]
  )

  /* ==== [BLOCK: onPaste – sync strings] BEGIN ==== */
  const onPaste = React.useCallback(
    (target: Item, values: readonly (readonly string[])[]) => {
      const [startCol, startVRow] = target
      const next = [...rows]
      for (let r = 0; r < values.length; r++) {
        const vRow = startVRow + r
        const mRow = visibleIndex[vRow] ?? vRow
        if (!next[mRow]) next[mRow] = { id: String(mRow + 1), navn: "", start: "", slutt: "" }
        const rowData = values[r]
        for (let c = 0; c < rowData.length; c++) {
          const outCol = startCol + c
          if (!columnsSpec[outCol]) continue
          const key = columnsSpec[outCol].key
          const val = rowData[c]
          ;(next[mRow] as any)[key] = key === "varighet" ? numberOrEmpty(val) : String(val ?? "")
        }
      }
      onRowsChange(next)
      return true
    },
    [rows, visibleIndex, onRowsChange]
  )
  /* ==== [BLOCK: onPaste – sync strings] END ==== */

  const fillDown = React.useCallback(() => {
    const rect = selection.current
    if (!rect || rect.height <= 1) return
    const { x, y, width, height } = rect
    const sourceVRow = y
    const sourceMRow = visibleIndex[sourceVRow] ?? sourceVRow
    const next = [...rows]
    for (let vr = y + 1; vr < y + height; vr++) {
      const mr = visibleIndex[vr] ?? vr
      if (!next[mr]) next[mr] = { id: String(mr + 1), navn: "", start: "", slutt: "" }
      for (let c = x; c < x + width; c++) {
        const key = columnsSpec[c].key
        ;(next[mr] as any)[key] = (next[sourceMRow] as any)[key]
      }
    }
    onRowsChange(next)
  }, [selection, rows, visibleIndex, onRowsChange])

  const fillRight = React.useCallback(() => {
    const rect = selection.current
    if (!rect || rect.width <= 1) return
    const { x, y, width, height } = rect
    const srcKey = columnsSpec[x].key
    const next = [...rows]
    for (let vr = y; vr < y + height; vr++) {
      const mr = visibleIndex[vr] ?? vr
      if (!next[mr]) next[mr] = { id: String(mr + 1), navn: "", start: "", slutt: "" }
      for (let c = x + 1; c < x + width; c++) {
        const key = columnsSpec[c].key
        ;(next[mr] as any)[key] = (next[mr] as any)[srcKey]
      }
    }
    onRowsChange(next)
  }, [selection, rows, visibleIndex, onRowsChange])

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC")
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === "d") { e.preventDefault(); fillDown() }
      if (key === "r") { e.preventDefault(); fillRight() }
    },
    [fillDown, fillRight]
  )

  const [menu, setMenu] = React.useState<{ x: number; y: number; vRow: number; col: number } | null>(null)
  const closeMenu = () => setMenu(null)
  const onContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const rect = selection.current
    if (!rect) return
    setMenu({ x: e.clientX, y: e.clientY, vRow: rect.y, col: rect.x })
  }

  const insertRowAt = (vRow: number) => {
    const mRow = visibleIndex[vRow] ?? vRow
    const next = [...rows]
    const newRow: Aktivitet = { id: String(next.length + 1), navn: "", start: "", slutt: "" }
    next.splice(mRow, 0, newRow)
    for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
    onRowsChange(next)
    closeMenu()
  }

  const deleteRowAt = (vRow: number) => {
    const mRow = visibleIndex[vRow] ?? vRow
    const next = rows.filter((_, i) => i !== mRow)
    for (let i = 0; i < next.length; i++) next[i].id = String(i + 1)
    onRowsChange(next)
    closeMenu()
  }

  const gridHeight = 560

  return (
    <div onKeyDown={onKeyDown} onContextMenu={onContextMenu} style={{ position: "relative" }}>
      <DataEditor
        columns={columns}
        getCellContent={getCellContent}
        rows={Math.max(visibleIndex.length, 50)}
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
        freezeColumns={1}
        onCellEdited={onCellEdited}
        onPaste={onPaste}
        onSelectionChange={setSelection}
        getCellsForSelection={true}
        height={gridHeight}
      />

      {menu && (
        <div
          style={{
            position: "fixed",
            left: menu.x, top: menu.y,
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,.12)",
            padding: 6, zIndex: 50, minWidth: 180
          }}
          onMouseLeave={closeMenu}
        >
          <button className="menu-item" onClick={() => insertRowAt(menu.vRow)}>Ny rad over</button>
          <button className="menu-item" onClick={() => insertRowAt(menu.vRow + 1)}>Ny rad under</button>
          <hr className="menu-sep" />
          <button className="menu-item" onClick={() => { fillDown(); closeMenu() }}>Fyll ned (Ctrl/Cmd+D)</button>
          <button className="menu-item" onClick={() => { fillRight(); closeMenu() }}>Fyll høyre (Ctrl/Cmd+R)</button>
          <hr className="menu-sep" />
          <button className="menu-item danger" onClick={() => deleteRowAt(menu.vRow)}>Slett rad</button>
        </div>
      )}
    </div>
  )
}
/* ==== [BLOCK: Component] END ==== */
