/**
 * Calcula el valor de cuota con interés simple mensual sobre el capital.
 * cuota = capital/n + capital × tasa%
 */
export function calcularCuota(capital: number, tasa: number, cuotas: number): number {
  return Math.round((capital / cuotas + capital * (tasa / 100)) * 100) / 100
}
