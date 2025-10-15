/* =========================================================
   BLOKK: Imports
   ========================================================= */
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  CellMouseDownEvent,
  CellKeyDownEvent,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import type { Aktivitet } from '@/types'

/* =========================================================
   BLOKK: Props
   ========================================================= */
export type AktivitetAGGridProps = {
  rows: Aktivitet[]
  onRowsChange: (next: Aktivitet[]) => void
  quickFilterText?: string
}

/* =========================================================
   BLOKK: Hjelpere
   ========================================================= */
const numberParser = (v: unknown) => {
  const s = String(v ?? '').trim()
  if (!s) return undefined
  const n = Number(s.replace(/,/g, '.'))
  return Number.isFinite(n) ? n : undefined
}
type CellRef = { rowIndex: number; field: keyof Aktivitet }
const inRange = (i: number, a: number, b: number) => i >= Math.min(a, b) && i <= Math.max(a, b)

/* =========================================================
   BLOKK: Komponent
   ========================================================= */
export default function AktivitetAGGrid({
  rows,
  onRowsChange,
  quickFilterText,
}: AktivitetAGGridProps) {
  const apiRef = useRef<GridApi | null>(null)
  const gridRootRef = useRef<HTMLDivElement | null>(null)
  const [rowData, setRowData] = useState<Aktivitet[]>(rows)

  // sync inn → lokalt
  React.useEffect(() => setRowData(rows), [rows])

  const setCell = useCallback(
    (id: string, field: keyof Aktivitet, value: unknown) => {
      onRowsChange(
        rowData.map(r => (r.id === id ? { ...r, [field]: value } as Aktivitet : r))
      )
    },
    [onRowsChange, rowData]
  )

  /* =========================================================
     BLOKK: Kolonner
     ========================================================= */
  const editableFields: (keyof Aktivitet)[] = [
    'navn', 'start', 'slutt', 'varighet', 'avhengighet', 'ansvarlig', 'status'
  ]
  const columnDefs = useMemo<ColDef<Aktivitet>[]>(() => [
    { headerName: '#', field: 'id', width: 80, pinned: 'left', editable: false, valueGetter: p => p.data?.id ?? '' },
    { headerName: 'Navn', field: 'navn', minWidth: 220, flex: 1, editable: true },
    {
      headerName: 'Start', field: 'start', width: 140, editable: true,
      valueSetter: (p) => { if (!p.data) return false; setCell(p.data.id, 'start', String(p.newValue ?? '')); return true }
    },
    {
      headerName: 'Slutt', field: 'slutt', width: 140, editable: true,
      valueSetter: (p) => { if (!p.data) return false; setCell(p.data.id, 'slutt', String(p.newValue ?? '')); return true }
    },
    {
      headerName: 'Varighet', field: 'varighet', width: 120, editable: true, type: 'numericColumn',
      valueGetter: p => p.data?.varighet ?? '',
      valueSetter: (p) => { if (!p.data) return false; setCell(p.data.id, 'varighet', numberParser(p.newValue)); return true }
    },
    { headerName: 'Avhengighet', field: 'avhengighet', width: 160, editable: true },
    { headerName: 'Ansvarlig', field: 'ansvarlig', width: 160, editable: true },
    { headerName: 'Status', field: 'status', width: 160, editable: true },
  ], [setCell])

  // Filter AV for å fjerne header-ikon + våre cellClassRules for markering
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    editable: true,
    filter: false,
    cellClassRules: {
      'mc-selected': p => isCellSelected(p.rowIndex ?? -1, String(p.colDef.field ?? '')),
      'mc-selected-edge': p => isCellSelectedEdge(p.rowIndex ?? -1, String(p.colDef.field ?? '')),
    },
  }), [])

  /* =========================================================
     BLOKK: Grid options
     ========================================================= */
  const gridOptions = useMemo<GridOptions<Aktivitet>>(() => ({
    defaultColDef,
    columnDefs,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    suppressClickEdit: true,           // gjør drag-seleksjon smooth
    ensureDomOrder: true,
    suppressMultiRangeSelection: true, // vi lager egen seleksjon
    suppressClipboardPaste: false,
    enableCellTextSelection: false,
    suppressCopyRowsToClipboard: true, // vi håndterer kopi selv
  }), [defaultColDef, columnDefs])

  /* =========================================================
     BLOKK: Egen multi-seleksjonstilstand
     ========================================================= */
  const [dragging, setDragging] = useState(false)
  const [anchor, setAnchor] = useState<CellRef | null>(null)
  const [focus, setFocus] = useState<CellRef | null>(null)

  // Full refresh av celler når utvalget endres
  React.useEffect(() => {
    apiRef.current?.refreshCells({ force: true, suppressFlash: true })
  }, [anchor, focus, dragging])

  // Hjelpeoppslag for kolonnerekkefølge
  const fieldOrder = React.useMemo(() => (['id', ...editableFields] as (keyof Aktivitet)[]), [editableFields])

  const isCellSelected = (rowIndex: number, field: string) => {
    if (!anchor || !focus) return false
    const f = field as keyof Aktivitet
    const inRows = inRange(rowIndex, anchor.rowIndex, focus.rowIndex)
    const inCols = inRange(fieldOrder.indexOf(f), fieldOrder.indexOf(anchor.field), fieldOrder.indexOf(focus.field))
    return inRows && inCols && f !== 'id'
  }

  const isCellSelectedEdge = (rowIndex: number, field: string) => {
    if (!anchor || !focus) return false
    const f = field as keyof Aktivitet
    if (f === 'id') return false
    const top = Math.min(anchor.rowIndex, focus.rowIndex)
    const bottom = Math.max(anchor.rowIndex, focus.rowIndex)
    const left = fieldOrder[Math.min(fieldOrder.indexOf(anchor.field), fieldOrder.indexOf(focus.field))]
    const right = fieldOrder[Math.max(fieldOrder.indexOf(anchor.field), fieldOrder.indexOf(focus.field))]
    const isTopOrBottom = rowIndex === top || rowIndex === bottom
    const isLeftOrRight = f === left || f === right
    return isCellSelected(rowIndex, field) && (isTopOrBottom || isLeftOrRight)
  }

  /* =========================================================
     BLOKK: Eventhandlere (mus + tastatur)
     ========================================================= */
  const onGridReady = useCallback((params: GridReadyEvent) => {
    apiRef.current = params.api as GridApi
    params.api.sizeColumnsToFit({ defaultMinWidth: 80 })
    params.api.setGridOption('quickFilterText', quickFilterText ?? '')
  }, [quickFilterText])

  React.useEffect(() => {
    apiRef.current?.setGridOption('quickFilterText', quickFilterText ?? '')
  }, [quickFilterText])

  const onCellMouseDown = useCallback((e: CellMouseDownEvent) => {
    if (e.colDef.field === 'id') return
    const domEvt = e.event as MouseEvent | null | undefined
    const rowIndex = e.rowIndex ?? 0
    const field = (e.colDef.field as keyof Aktivitet) ?? 'navn'

    if (domEvt?.shiftKey && anchor) {
      setFocus({ rowIndex, field })
    } else {
      setAnchor({ rowIndex, field })
      setFocus({ rowIndex, field })
    }
    setDragging(true)
  }, [anchor])

  // Global mousemove → finn ag-cell under pekeren og oppdater focus
  React.useEffect(() => {
    if (!dragging) return

    const onMove = (ev: MouseEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      if (!el) return
      const cellEl = (el as HTMLElement).closest('.ag-cell') as HTMLElement | null
      if (!cellEl) return
      const rowEl = cellEl.closest('.ag-row') as HTMLElement | null
      const colId = cellEl.getAttribute('col-id') || ''
      const rowIndexAttr =
        rowEl?.getAttribute('row-index') ??
        rowEl?.getAttribute('row-id') ?? // fallback
        rowEl?.getAttribute('aria-rowindex') // fallback (1-based)
      if (!rowIndexAttr || !colId) return

      // aria-rowindex er 1-basert – juster i så fall
      let rowIndex = Number(rowIndexAttr)
      if (rowEl?.hasAttribute('aria-rowindex')) rowIndex = rowIndex - 1

      // hopp over ID-kolonne
      if (colId === 'id') return
      const field = colId as keyof Aktivitet
      setFocus({ rowIndex, field })
    }

    const onUp = () => setDragging(false)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const ensureRows = (neededCount: number) => {
    if (neededCount <= rowData.length) return
    const add = neededCount - rowData.length
    const maxId = rowData.reduce((m, r) => Math.max(m, Number(r.id || 0)), 0)
    const next = [...rowData]
    for (let i = 1; i <= add; i++) {
      next.push({ id: String(maxId + i), navn: '', start: '', slutt: '', ansvarlig: '', status: '' })
    }
    onRowsChange(next)
  }

  const getSelectionBounds = () => {
    if (!anchor || !focus) return null
    const r1 = Math.min(anchor.rowIndex, focus.rowIndex)
    const r2 = Math.max(anchor.rowIndex, focus.rowIndex)
    const c1 = Math.min(fieldOrder.indexOf(anchor.field), fieldOrder.indexOf(focus.field))
    const c2 = Math.max(fieldOrder.indexOf(anchor.field), fieldOrder.indexOf(focus.field))
    const fields = fieldOrder.slice(c1, c2 + 1).filter(f => f !== 'id')
    return { r1, r2, fields }
  }

  const copySelectionToClipboard = async () => {
    const b = getSelectionBounds()
    if (!b) return
    const rowsNeeded = b.r2 + 1
    await ensureRows(rowsNeeded)
    const lines: string[] = []
    for (let r = b.r1; r <= b.r2; r++) {
      const row = apiRef.current!.getDisplayedRowAtIndex(r)?.data as Aktivitet | undefined
      const vals = b.fields.map(f => String((row as any)?.[f] ?? ''))
      lines.push(vals.join('\t'))
    }
    const tsv = lines.join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = tsv
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  const pasteClipboardIntoSelection = async () => {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }
    if (!text) return
    const b = getSelectionBounds()
    if (!b) return
    const rows = text.split(/\r?\n/).map(l => l.split('\t'))
    const neededRows = (b.r1 + rows.length)
    await ensureRows(neededRows)

    const next = [...rowData]
    for (let i = 0; i < rows.length; i++) {
      const rIndex = b.r1 + i
      const row = { ...(apiRef.current!.getDisplayedRowAtIndex(rIndex)?.data as Aktivitet ?? { id: String(rIndex + 1) }) }
      for (let j = 0; j < b.fields.length; j++) {
        const f = b.fields[j]
        const val = rows[i][j] ?? ''
        ;(row as any)[f] = f === 'varighet' ? numberParser(val) : val
      }
      const idxInArray = next.findIndex(x => x.id === row.id)
      if (idxInArray >= 0) next[idxInArray] = row
      else next.push(row)
    }
    onRowsChange(next)
  }

  const fillDown = () => {
    const b = getSelectionBounds()
    if (!b) return
    const srcRow = apiRef.current!.getDisplayedRowAtIndex(b.r1)?.data as Aktivitet | undefined
    if (!srcRow) return
    const next = [...rowData]
    for (let r = b.r1 + 1; r <= b.r2; r++) {
      const row = { ...(apiRef.current!.getDisplayedRowAtIndex(r)?.data as Aktivitet ?? { id: String(r + 1) }) }
      for (const f of b.fields) (row as any)[f] = (srcRow as any)[f]
      const idxInArray = next.findIndex(x => x.id === row.id)
      if (idxInArray >= 0) next[idxInArray] = row
      else next.push(row)
    }
    onRowsChange(next)
  }

  const fillRight = () => {
    const b = getSelectionBounds()
    if (!b) return
    const srcField = b.fields[0]
    const next = [...rowData]
    for (let r = b.r1; r <= b.r2; r++) {
      const row = { ...(apiRef.current!.getDisplayedRowAtIndex(r)?.data as Aktivitet ?? { id: String(r + 1) }) }
      for (const f of b.fields.slice(1)) (row as any)[f] = (row as any)[srcField]
      const idxInArray = next.findIndex(x => x.id === row.id)
      if (idxInArray >= 0) next[idxInArray] = row
      else next.push(row)
    }
    onRowsChange(next)
  }

  const onCellKeyDown = useCallback((e: CellKeyDownEvent) => {
    if (!anchor || !focus) return
    const kev = e.event as KeyboardEvent | null | undefined
    if (!kev) return
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const mod = isMac ? kev.metaKey : kev.ctrlKey
    const key = kev.key?.toLowerCase?.() ?? ''
    if (mod && key === 'c') {
      kev.preventDefault()
      copySelectionToClipboard()
    }
    if (mod && key === 'v') {
      kev.preventDefault()
      pasteClipboardIntoSelection()
    }
    if (mod && key === 'd') {
      kev.preventDefault()
      fillDown()
    }
    if (mod && key === 'r') {
      kev.preventDefault()
      fillRight()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, focus, rowData])

  /* =========================================================
     BLOKK: Render
     ========================================================= */
  return (
    <div ref={gridRootRef} className="ag-theme-quartz" style={{ height: 560, width: '100%' }}>
      <AgGridReact<Aktivitet>
        gridOptions={gridOptions}
        rowData={rowData}
        onGridReady={onGridReady}
        onCellMouseDown={onCellMouseDown}
        onCellKeyDown={onCellKeyDown}
      />
    </div>
  )
}
