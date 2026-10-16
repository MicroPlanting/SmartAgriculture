// Single source of truth for emergency thresholds (website side). The ESP32 firmware must use the same values.
export const TEMPERATURE_THRESHOLD = 35;   // °C, strict greater-than
export const GAS_THRESHOLD = 1000;         // raw sensor reading (not ppm), strict greater-than
export const SOIL_DRY_LIMIT = 3500;        // raw ADC, dry at or above; never part of the emergency
const ok = n => typeof n === "number" && Number.isFinite(n);
export function evaluate({ temperature, gas } = {}) {
  const t = ok(temperature) ? temperature : null, g = ok(gas) ? gas : null;
  const temp = t !== null && t > TEMPERATURE_THRESHOLD, gasHigh = g !== null && g > GAS_THRESHOLD;
  return { temp, gas: gasHigh, tempUnavailable: t === null, gasUnavailable: g === null, active: temp || gasHigh };
}
