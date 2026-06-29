/**
 * Calculadora de ETA inteligente con ajustes heurísticos de tráfico para Managua/Nicaragua.
 */
export function computeEta(
  baseDurationSec: number,
  distanceMeters: number,
  hourOfDay: number,    // 0-23
  dayOfWeek: number,    // 0-6
  isRainy = false
): number {
  let factor = 1.0;

  // Horas pico en Managua: 7:00 AM - 9:00 AM y 4:00 PM - 7:00 PM (16:00 - 19:00)
  if ((hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 16 && hourOfDay <= 19)) {
    factor = 1.35; // Incremento del 35% por atascos
  }

  // Fines de semana: Sábado por la tarde (después de mediodía) y Domingo hay menos tráfico
  if (dayOfWeek === 0 || (dayOfWeek === 6 && hourOfDay >= 12)) {
    factor *= 0.85; // 15% más rápido
  }

  // Clima: La lluvia extrema en Managua reduce significativamente la velocidad vial (cauces, baches tapados)
  if (isRainy) {
    factor *= 1.25; // 25% más lento
  }

  // Margen de retraso por distancia (paradas imprevistas o semáforos)
  if (distanceMeters > 5000) factor += 0.05;
  if (distanceMeters > 15000) factor += 0.10;

  return Math.round(baseDurationSec * factor);
}
