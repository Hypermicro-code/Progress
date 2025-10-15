/* =========================================================
valueSetter: (p: ValueSetterParams<Aktivitet>) => { setCell(p.data!.id, 'start', String(p.newValue ?? '')); return true }
},
{
headerName: 'Slutt', field: 'slutt', width: 140, editable: true,
valueSetter: (p: ValueSetterParams<Aktivitet>) => { setCell(p.data!.id, 'slutt', String(p.newValue ?? '')); return true }
},
{
headerName: 'Varighet', field: 'varighet', width: 120, editable: true,
valueGetter: (p) => p.data?.varighet ?? '',
valueSetter: (p) => { setCell(p.data!.id, 'varighet', numberParser(p.newValue)); return true },
type: 'numericColumn'
},
{ headerName: 'Avhengighet', field: 'avhengighet', width: 160, editable: true },
{ headerName: 'Ansvarlig', field: 'ansvarlig', width: 160, editable: true },
{ headerName: 'Status', field: 'status', width: 160, editable: true },
], [setCell])


const defaultColDef = useMemo<ColDef>(() => ({
sortable: true,
resizable: true,
filter: true,
editable: true,
}), [])


/* =========================================================
BLOKK: Grid options (Excel-lignende)
========================================================= */
const gridOptions = useMemo<GridOptions<Aktivitet>>(() => ({
defaultColDef,
columnDefs,
enableRangeSelection: true,
enableRangeHandle: true,
enableFillHandle: true,
undoRedoCellEditing: true,
undoRedoCellEditingLimit: 100,
rowSelection: 'multiple',
ensureDomOrder: true,
suppressMultiRangeSelection: false,
// Tillat kopier/lim (tekst)
suppressClipboardPaste: false,
enableCellTextSelection: true,
}), [defaultColDef, columnDefs])


/* =========================================================
BLOKK: Handlere
========================================================= */
const onGridReady = useCallback((params: any) => {
apiRef.current = params.api as GridApi
params.api.sizeColumnsToFit({ defaultMinWidth: 80 })
}, [])


const addRows = (n = 1) => {
const maxId = rowData.reduce((m, r) => Math.max(m, Number(r.id || 0)), 0)
const next: Aktivitet[] = [...rowData]
for (let i = 1; i <= n; i++) {
next.push({ id: String(maxId + i), navn: '', start: '', slutt: '', ansvarlig: '', status: '' })
}
onRowsChange(next)
}


// Valgfritt: hvis du limer inn flere rader enn som finnes, append flere
const onPasteEnd = useCallback((e: any) => {
const rowsPasted = e?.data?.length ?? 0
if (!rowsPasted) return
const focused = apiRef.current?.getFocusedCell()
if (!focused) return
const startRow = focused.rowIndex ?? 0
const need = Math.max(0, startRow + rowsPasted - rowData.length)
if (need > 0) addRows(need)
}, [rowData])


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
