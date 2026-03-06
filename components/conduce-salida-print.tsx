"use client"

import React, { forwardRef } from "react"

export interface ConduceSalidaData {
    noteNumber: string
    date: string
    departureTime: string
    routeName: string
    driverName: string
    driverCedula?: string
    vehiclePlate: string
    vehicleBrand?: string
    vehicleModel?: string
    pettyCash: number
    items: { name: string; qty: number; unit: string }[]
    companyName?: string
    companyAddress?: string
    companyPhone?: string
    companyRnc?: string
}

const ConduceSalidaPrint = forwardRef<HTMLDivElement, { data: ConduceSalidaData }>(({ data }, ref) => {
    const totalUnits = data.items.reduce((s, i) => s + i.qty, 0)
    const timeStr = data.departureTime
        ? new Date(data.departureTime).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })

    return (
        <div ref={ref} className="conduce-print-area">
            <style>{`
                .conduce-print-area {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #111;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 32px;
                    background: #fff;
                }
                .conduce-print-area * { box-sizing: border-box; }
                .cp-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
                .cp-company { flex: 1; }
                .cp-company h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .cp-company p { font-size: 11px; color: #475569; margin: 2px 0; }
                .cp-doc-info { text-align: right; }
                .cp-doc-info .cp-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
                .cp-doc-info .cp-note-num { font-size: 20px; font-weight: 800; color: #ea580c; margin: 4px 0; font-family: 'Courier New', monospace; }
                .cp-doc-info .cp-type { display: inline-block; background: #ea580c; color: #fff; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 3px; text-transform: uppercase; letter-spacing: 1px; }

                .cp-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .cp-meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
                .cp-meta-box h3 { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin: 0 0 8px 0; }
                .cp-meta-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
                .cp-meta-row .cp-k { font-size: 11px; color: #64748b; }
                .cp-meta-row .cp-v { font-size: 11px; font-weight: 600; color: #1e293b; }

                .cp-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .cp-table th { background: #1e293b; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; font-weight: 600; }
                .cp-table th:last-child { text-align: right; }
                .cp-table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                .cp-table td:last-child { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
                .cp-table tr:nth-child(even) { background: #f8fafc; }
                .cp-table tfoot td { font-weight: 800; font-size: 13px; color: #0f172a; border-top: 2px solid #1e293b; background: #f1f5f9; }

                .cp-cash { display: flex; justify-content: flex-end; margin-bottom: 24px; }
                .cp-cash-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px 20px; text-align: center; min-width: 200px; }
                .cp-cash-label { font-size: 9px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; }
                .cp-cash-amount { font-size: 22px; font-weight: 800; color: #92400e; font-family: 'Courier New', monospace; }

                .cp-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; padding-top: 16px; }
                .cp-sig-box { text-align: center; }
                .cp-sig-line { border-top: 1.5px solid #334155; margin-bottom: 6px; }
                .cp-sig-name { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

                .cp-footer { margin-top: 32px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }

                @media print {
                    body * { visibility: hidden; }
                    .conduce-print-area, .conduce-print-area * { visibility: visible; }
                    .conduce-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
                    @page { margin: 0.5in; }
                }
            `}</style>

            {/* Header */}
            <div className="cp-header">
                <div className="cp-company">
                    <h1>{data.companyName || "Mi Empresa"}</h1>
                    {data.companyRnc && <p>RNC: {data.companyRnc}</p>}
                    {data.companyAddress && <p>{data.companyAddress}</p>}
                    {data.companyPhone && <p>Tel: {data.companyPhone}</p>}
                </div>
                <div className="cp-doc-info">
                    <div className="cp-label">Conduce de Salida</div>
                    <div className="cp-note-num">{data.noteNumber}</div>
                    <div className="cp-type">Salida de Planta</div>
                </div>
            </div>

            {/* Meta info (2 columns) */}
            <div className="cp-meta">
                <div className="cp-meta-box">
                    <h3>Información del Despacho</h3>
                    <div className="cp-meta-row"><span className="cp-k">Fecha:</span><span className="cp-v">{data.date}</span></div>
                    <div className="cp-meta-row"><span className="cp-k">Hora de salida:</span><span className="cp-v">{timeStr}</span></div>
                    <div className="cp-meta-row"><span className="cp-k">Ruta:</span><span className="cp-v">{data.routeName}</span></div>
                </div>
                <div className="cp-meta-box">
                    <h3>Equipo Asignado</h3>
                    <div className="cp-meta-row"><span className="cp-k">Chofer:</span><span className="cp-v">{data.driverName}</span></div>
                    {data.driverCedula && <div className="cp-meta-row"><span className="cp-k">Cédula:</span><span className="cp-v">{data.driverCedula}</span></div>}
                    <div className="cp-meta-row"><span className="cp-k">Vehículo:</span><span className="cp-v">{data.vehiclePlate} {data.vehicleBrand ? `— ${data.vehicleBrand}` : ""} {data.vehicleModel || ""}</span></div>
                </div>
            </div>

            {/* Items Table */}
            <table className="cp-table">
                <thead>
                    <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Producto</th>
                        <th>Unidad</th>
                        <th style={{ textAlign: "right" }}>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, i) => (
                        <tr key={i}>
                            <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.unit}</td>
                            <td>{item.qty}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} style={{ textAlign: "right" }}>TOTAL UNIDADES</td>
                        <td style={{ textAlign: "right" }}>{totalUnits}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Petty Cash */}
            <div className="cp-cash">
                <div className="cp-cash-box">
                    <div className="cp-cash-label">Fondo de Caja Entregado</div>
                    <div className="cp-cash-amount">RD$ {data.pettyCash.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Signatures */}
            <div className="cp-signatures">
                <div className="cp-sig-box">
                    <div className="cp-sig-line" />
                    <div className="cp-sig-name">Despachador</div>
                </div>
                <div className="cp-sig-box">
                    <div className="cp-sig-line" />
                    <div className="cp-sig-name">Chofer ({data.driverName})</div>
                </div>
                <div className="cp-sig-box">
                    <div className="cp-sig-line" />
                    <div className="cp-sig-name">Supervisor</div>
                </div>
            </div>

            {/* Footer */}
            <div className="cp-footer">
                Documento generado automáticamente — {data.companyName || "Sistema"} — {new Date().toLocaleDateString("es-DO")} {new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
            </div>
        </div>
    )
})

ConduceSalidaPrint.displayName = "ConduceSalidaPrint"
export default ConduceSalidaPrint
