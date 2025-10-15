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

/* =========================================================
   BLOKK: Komponent
   ========================================================= */
export default function AktivitetAGGrid({
  rows,
  onRowsChange,
  quickFilterText,
}: AktivitetAGGridProps) {
  const apiRef = useRef<GridApi | null>(null)
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
  const columnDefs = useMemo<ColDef<Aktivitet>[]>(() => [
    {
      headerName: '#',
      field: 'id',
      width: 80,
      pinned: 'left',
      editable: false,
      valueGetter: (p) => p.data?.id ?? '',
    },
    { headerName: 'Navn', field: 'navn', minWidth: 220, flex: 1, editable: true },
    {
      headerName: 'Start',
      field: 'start',
      width: 140,
      editable: true,
      valueSetter: (p) => {
        if (!p.data) return false
        setCell(p.data.id, 'start', String(p.newValue ?? ''))
        return true
      },
    },
    {
      headerName: 'Slutt',
      field: 'slutt',
      width: 140,
      editable: true,
      valueSetter: (p) => {
        if (!p.data) return false
        setCell(p.data.id, 'slutt', String(p.newValue ?? ''))
        return true
      },
    },
    {
      headerName: 'Varighet',
      field: 'varighet',
      width: 120,
      editable: true,
      valueGetter: (p) => p.data?.varighet ?? '',
      valueSetter: (p) => {
        if (!p.data) return false
        setCell(p.data.id, 'varighet', numberParser(p.newValue))
        return true
      },
      type: 'numericColumn',
    },
    { headerName: 'Avhengighet', field: 'avhengighet', width: 160, editable: true },
    { headerName: 'Ansvarlig', field: 'ansvarlig', width: 160, editable: true },
    { headerName: 'Status', field: 'status', width: 160, editable: true },
  ], [setCell])

  // Filter er AV for å fjerne filter-ikon i header
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    editable: true,
    filter: false,
  }), [])

  /* =========================================================
     BLOKK: Grid options
     ========================================================= */
  const gridOptions = useMemo<GridOptions<Aktivitet>>(() => ({
    defaultColDef,
    columnDefs,
    // Tydelig cell-fokus via CSS (range selection = Enterprise)
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    ensureDomOrder: true,
    suppressMultiRangeSelection: false,
    suppressClipboardPaste: false,
    enableCellTextSelection: false, // bruk cellefokus, ikke tekstmarkering
  }), [defaultColDef, columnDefs])

  /* =========================================================
     BLOKK: Handlere
     ========================================================= */
  const onGridReady = useCallback((params: GridReadyEvent) => {
    apiRef.current = params.api as GridApi
    params.api.sizeColumnsToFit({ defaultMinWidth: 80 })
    params.api.setQuickFilter(quickFilterText ?? '')
  }, [quickFilterText])

  // Oppdater Quick Filter live
  React.useEffect(() => {
    apiRef.current?.setQuickFilter(quickFilterText ?? '')
  }, [quickFilterText])

  const addRows = (n = 1) => {
    const maxId = rowData.reduce((m, r) => Math.max(m, Number(r.id || 0)), 0)
    const next: Aktivitet[] = [...rowData]
    for (let i = 1; i <= n; i++) {
      next.push({
        id: String(maxId + i),
        navn: '',
        start: '',
        slutt: '',
        ansvarlig: '',
        status: '',
      })
    }
    onRowsChange(next)
  }

  // Append flere rader automatisk ved stor paste
  const onPasteEnd = useCallback((e: any) => {
    const rowsPasted = Array.isArray(e?.data) ? e.data.length : 0
    if (!rowsPasted) return
    const focused = apiRef.current?.getFocusedCell()
    if (!focused) return
    const startRow = focused.rowIndex ?? 0
    const need = Math.max(0, startRow + rowsPasted - rowData.length)
    if (need > 0) addRows(need)
  }, [rowData])

  /* =========================================================
     BLOKK: Render
     ========================================================= */
  return (
    <div className="ag-theme-quartz" style={{ height: 560, width: '100%' }}>
      <AgGridReact<Aktivitet>
        gridOptions={gridOptions}
        rowData={rowData}
        onGridReady={onGridReady}
        onPasteEnd={onPasteEnd}
      />
    </div>
  )
}
