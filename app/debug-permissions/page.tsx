"use client"

import { PermissionsDebugger } from '@/components/debug/permissions-debugger'

export default function DebugPermissionsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Depurador de Permisos</h1>
      <p className="text-slate-400 mb-8">
        Esta página te ayuda a diagnosticar problemas con permisos de usuarios.
        Úsala para verificar si un empleado tiene los permisos correctos.
      </p>
      <PermissionsDebugger />
    </div>
  )
}
