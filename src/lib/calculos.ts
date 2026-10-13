// La cuota efectiva se redondea al millar (REDONDEAR(x, -3) de la hoja de cálculo)
const REDONDEO_CUOTA = 1000

export interface DesglosePrestamo {
  /** capital × meses_interes × tasa% */
  totalInteresesEstimado: number
  /** capital + totalInteresesEstimado */
  totalDeudaEstimada: number
  /** totalDeudaEstimada / cuotas (sin redondear) */
  cuotaCalculada: number
  /** cuota redondeada al millar → prestamos.valor_cuota */
  valorCuota: number
  /** valorCuota × cuotas → prestamos.total_deuda */
  totalDeuda: number
  /** totalDeuda − capital → prestamos.total_intereses */
  totalIntereses: number
  /** (cuotas × valorCuota / capital − 1) / meses_interes, en % con 4 decimales
   *  → prestamos.tasa_interes_efectiva */
  tasaEfectiva: number
}

/**
 * Cálculo del préstamo: los meses de interés son independientes del número de
 * cuotas (p. ej. 2.5 meses de interés en 2 cuotas). `tasa` es % mensual.
 * Única fuente de verdad: la usan la vista previa del formulario y las
 * Server Actions (el servidor siempre recalcula).
 */
export function calcularPrestamo(
  capital: number,
  tasa: number,
  cuotas: number,
  mesesInteres: number
): DesglosePrestamo {
  const totalInteresesEstimado = capital * mesesInteres * (tasa / 100)
  const totalDeudaEstimada = capital + totalInteresesEstimado
  const cuotaCalculada = totalDeudaEstimada / cuotas

  const valorCuota = Math.round(cuotaCalculada / REDONDEO_CUOTA) * REDONDEO_CUOTA
  const totalDeuda = valorCuota * cuotas
  const totalIntereses = totalDeuda - capital

  const tasaEfectiva =
    Math.round(((totalDeuda / capital - 1) / mesesInteres) * 100 * 10_000) / 10_000

  return {
    totalInteresesEstimado,
    totalDeudaEstimada,
    cuotaCalculada,
    valorCuota,
    totalDeuda,
    totalIntereses,
    tasaEfectiva,
  }
}
