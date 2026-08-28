/**
 * RFForge — return-loss reporting helpers (Module A / Module D).
 *
 * An exactly-solved match drives the reflection coefficient toward zero and
 * the return loss toward +Infinity (e.g. 300+ dB). That is correct math but
 * misleading to report literally: no real circuit gets within 60 dB because of
 * component tolerance, loss, and non-ideal values. RF engineers conventionally
 * stop quoting meaningful return-loss precision around 40-60 dB. These helpers
 * cap display/explanation values without ever touching the raw calculation.
 */

/** Beyond this, return loss is reported as effectively unmeasurable. */
export const RETURN_LOSS_CAP_DB = 60

/** True when a return-loss value should be capped in display/explanation. */
export function isBeyondReturnLossCap(db: number): boolean {
  return !Number.isFinite(db) || db > RETURN_LOSS_CAP_DB
}

/**
 * Text form of a return loss for display. Returns a short capped token like
 * "> 60 dB" when the value is beyond the reportable range, otherwise the
 * one-decimal dB string. The raw value is never altered by callers of this.
 */
export function cappedReturnLossText(db: number): string {
  if (isBeyondReturnLossCap(db)) return `> ${RETURN_LOSS_CAP_DB} dB`
  return `${db.toFixed(1)} dB`
}
