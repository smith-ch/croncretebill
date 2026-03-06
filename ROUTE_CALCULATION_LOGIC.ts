/**
 * Lógica de Negocio: Cálculo del Día y Gestión de Frecuencias
 * -------------------------------------------------------------
 * 
 * Este archivo demuestra la lógica que deberá ser implementada en el nuevo backend (NestJS).
 * El objetivo principal es determinar qué clientes deben ser visitados "hoy" basándose en:
 * 1. El día de la semana que le toca al cliente (Lunes, Martes, etc.)
 * 2. La frecuencia de visita asignada (Semanal, Quincenal, Mensual)
 * 3. La fecha de la *última* visita registrada (para frecuencias mayores a Semanal).
 */

import { differenceInDays, differenceInWeeks, differenceInMonths, startOfDay } from 'date-fns';

// --------------------- TIPOS BASE (Mock de Prisma) ---------------------
type DayOfWeek = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";
type Frequency = "SEMANAL" | "QUINCENAL" | "MENSUAL";

interface ClientRouteAssignment {
    clientId: string;
    routeId: string;
    dayOfWeek: DayOfWeek;
    frequency: Frequency;
    visitOrder: number;
    // Campo virtual o real añadido para saber cuándo fue la última vez que el despachador marcó "Visitado"
    lastVisitedDate: Date | null;
}

/**
 * Función Auxiliar: Mapear Date.getDay() de JavaScript a nuestro Enum DayOfWeek
 * JS getDay(): 0 = Domingo, 1 = Lunes, 2 = Martes...
 */
function getDayOfWeekEnum(date: Date): DayOfWeek {
    const jsDay = date.getDay();
    const map: Record<number, DayOfWeek> = {
        0: 'DOMINGO',
        1: 'LUNES',
        2: 'MARTES',
        3: 'MIERCOLES',
        4: 'JUEVES',
        5: 'VIERNES',
        6: 'SABADO'
    };
    return map[jsDay];
}

/**
 * CORE LOGIC: ¿Le toca visita a este cliente hoy?
 * 
 * @param assignment El registro de asignación del cliente a la ruta
 * @param targetDate La fecha para la cual estamos generando el Despacho (usualmente "hoy")
 * @returns boolean
 */
export function isClientScheduledForDate(assignment: ClientRouteAssignment, targetDate: Date = new Date()): boolean {
    // 1. Regla de Oro: El día de la semana debe coincidir obligatoriamente.
    // Si la asignación dice "MARTES" y targetDate es "JUEVES", automáticamente retorna false.
    const targetDayEnum = getDayOfWeekEnum(targetDate);
    if (assignment.dayOfWeek !== targetDayEnum) {
        return false;
    }

    // 2. Si no ha sido visitado nunca, entra al despacho por defecto para iniciar su ciclo.
    if (!assignment.lastVisitedDate) {
        return true;
    }

    // Normalizamos las fechas al inicio del día para evitar problemas de horas (00:00:00)
    const normalizedTarget = startOfDay(targetDate);
    const normalizedLastVisit = startOfDay(new Date(assignment.lastVisitedDate));

    // 3. Evaluar según Frecuencia
    switch (assignment.frequency) {
        case 'SEMANAL':
            // "Cada semana": Mientras haya pasado 1 semana (o más) desde la última visita es válido.
            // Ej: Última visita fue Martes pasado (hace 7 días). Hoy es Martes, entonces sí.
            // Si el cliente no fue visitado semana pasada, hoy tiene 14 días. differenceInWeeks será >= 1. Devuelve true.
            return differenceInWeeks(normalizedTarget, normalizedLastVisit) >= 1;

        case 'QUINCENAL':
            // "Cada 2 semanas": Debe haber pasado al menos 14 días (2 semanas) desde la última vez.
            return differenceInWeeks(normalizedTarget, normalizedLastVisit) >= 2;

        case 'MENSUAL':
            // "Una vez al mes": Evaluamos por mes.
            // Un mes puede ser exacto (Día 15 del mes pasado -> Día 15 de este mes)
            // o buscar que simplemente haya cambiado el mes calendario. Aquí usamos diferencia estricta de meses: >= 1.
            return differenceInMonths(normalizedTarget, normalizedLastVisit) >= 1;

        default:
            return false; // Fail-safe
    }
}

/**
 * Ejemplo de uso en un Servicio de NestJS (Generación Diaria del Despacho)
 * Esta función se correría automáticamente a las 00:01 AM todos los días 
 * mediante un CRON Job (ej. usando @nestjs/schedule), o se calcula al vuelo.
 */
export async function generateDailyDispatch(routeId: string, currentDate: Date) {
    /*
    // Pseudo-código del Backend ORM:
    
    // 1. Obtener todas las asignaciones de la ruta específica de la BD
    const allAssignments = await prisma.clientRouteAssignment.findMany({
        where: { routeId: routeId },
        include: { lastVisitHistory: true } // Asumiendo que podemos sacar lastVisitedDate de otra tabla
    });

    // 2. Filtrar únicamente los clientes que "caen" en la fecha de hoy
    const cliensForToday = allAssignments.filter(assignment => 
        isClientScheduledForDate(assignment, currentDate)
    );

    // 3. Ordenarlos por el 'visitOrder' que estableció el usuario en la UI
    cliensForToday.sort((a, b) => a.visitOrder - b.visitOrder);

    // 4. Crear el registro "DailyDispatch" en la BD y atar a estos clientes seleccionados.
    const newDispatch = await prisma.dailyDispatch.create({
        data: {
            routeId: routeId,
            date: currentDate,
            status: 'PENDIENTE',
            pathItems: { ... cliensForToday ... } 
        }
    });
    
    return newDispatch;
    */
}
