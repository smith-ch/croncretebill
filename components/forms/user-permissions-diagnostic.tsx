"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, User, Shield } from "lucide-react"
import { diagnosePermissionIssues, repairUserPermissions } from "@/lib/user-permissions"

export function UserPermissionsDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [repairResult, setRepairResult] = useState<any>(null)

  const runDiagnosis = async () => {
    setLoading(true)
    try {
      const result = await diagnosePermissionIssues()
      setDiagnosis(result)
    } catch (error) {
      console.error("Error en diagnóstico:", error)
    } finally {
      setLoading(false)
    }
  }

  const runRepair = async () => {
    setRepairing(true)
    try {
      const result = await repairUserPermissions()
      setRepairResult(result)
      // Volver a diagnosticar después de la reparación
      setTimeout(() => {
        runDiagnosis()
      }, 1000)
    } catch (error) {
      console.error("Error en reparación:", error)
    } finally {
      setRepairing(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Diagnóstico de Permisos de Usuario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnosis} disabled={loading} variant="outline">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Diagnosticar
          </Button>
          
          {diagnosis && !diagnosis.success && (
            <Button onClick={runRepair} disabled={repairing} variant="default">
              {repairing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reparar Permisos
            </Button>
          )}
        </div>

        {diagnosis && (
          <div className="space-y-4">
            <Alert className={diagnosis.success ? "border-green-800 bg-green-900/30" : "border-red-800 bg-red-900/30"}>
              <AlertDescription className="flex items-center gap-2">
                {diagnosis.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className={diagnosis.success ? "text-green-300" : "text-red-300"}>
                  {diagnosis.message}
                </span>
              </AlertDescription>
            </Alert>

            {diagnosis.diagnostics && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Información del Usuario:</span>
                </div>
                
                <div className="pl-6 space-y-2 text-sm">
                  <div>
                    <strong>ID:</strong> {diagnosis.diagnostics.userId}
                  </div>
                  <div>
                    <strong>Email:</strong> {diagnosis.diagnostics.email}
                  </div>
                  {diagnosis.diagnostics.profile && (
                    <div>
                      <strong>Perfil:</strong> 
                      <Badge variant="outline" className="ml-2">
                        {diagnosis.diagnostics.profile.role}
                      </Badge>
                    </div>
                  )}
                </div>

                {diagnosis.issues && diagnosis.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-red-600">Problemas Detectados:</div>
                    <ul className="pl-6 space-y-1 text-sm">
                      {diagnosis.issues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="font-mono text-red-400">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnosis.diagnostics.recommendations && diagnosis.diagnostics.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-blue-600">Recomendaciones:</div>
                    <ul className="pl-6 space-y-1 text-sm">
                      {diagnosis.diagnostics.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-blue-400">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(diagnosis.diagnostics.clientsCount !== undefined || diagnosis.diagnostics.productsCount !== undefined) && (
                  <div className="space-y-2">
                    <div className="font-medium">Estadísticas de Acceso:</div>
                    <div className="pl-6 space-y-1 text-sm">
                      {diagnosis.diagnostics.clientsCount !== undefined && (
                        <div>Clientes accesibles: {diagnosis.diagnostics.clientsCount}</div>
                      )}
                      {diagnosis.diagnostics.productsCount !== undefined && (
                        <div>Productos accesibles: {diagnosis.diagnostics.productsCount}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {repairResult && (
          <Alert className={repairResult.success ? "border-green-800 bg-green-900/30" : "border-yellow-200 bg-yellow-50"}>
            <AlertDescription className={repairResult.success ? "text-green-300" : "text-yellow-800"}>
              {repairResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}