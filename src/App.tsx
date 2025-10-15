import React from "react"
import AktivitetGlideGrid from "@/components/AktivitetGlideGrid"
import type { Aktivitet } from "@/types"

export default function App() {
  const dummies: Aktivitet[] = [
    { id: "1", navn: "Kontraktsignering", start: "2025-05-28", slutt: "2025-05-28", varighet: 1 },
    { id: "2", navn: "Prosjektering og innkjøp", start: "2025-05-29", slutt: "2025-06-22", varighet: 17 },
    { id: "3", navn: "Installasjon ATB/ES", start: "2025-08-12", slutt: "2025-08-20", varighet: 7 },
  ]
  const [rows, setRows] = React.useState<Aktivitet[]>([
    ...dummies,
    ...Array.from({ length: 17 }, (_, i) => ({
      id: String(dummies.length + i + 1),
      navn: "", start: "", slutt: "", ansvarlig: "", status: ""
    }))
  ])

  return (
    <div className="wrapper">
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h1 style={{ margin:0, fontSize:20 }}>Progress – Tabell (Glide Data Grid)</h1>
          <div className="toolbar">
            <button className="btn" onClick={() => setRows(r => [...r, { id: String(r.length + 1), navn: "", start: "", slutt: "", ansvarlig: "", status: "" }])}>Ny rad</button>
          </div>
        </div>
        <AktivitetGlideGrid rows={rows} onRowsChange={setRows} />
      </div>
    </div>
  )
}
