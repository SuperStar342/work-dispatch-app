/** Normalize user-entered piece quantities without silently turning 1.5 into 15. */
export function normalizeWholeQuantity(value: unknown, max = Number.MAX_SAFE_INTEGER) {
  const match = String(value ?? '').trim().match(/^\d+/)
  const parsed = match ? Number(match[0]) : 0
  const safeValue = Number.isSafeInteger(parsed) ? parsed : 0
  const safeMax = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : Number.MAX_SAFE_INTEGER
  return Math.min(safeValue, safeMax)
}

/** Keep the visible native/H5 input value in sync when invalid characters are rejected. */
export function syncWholeQuantityInput(event: any, value: number) {
  const text = String(value)
  if (event?.detail) event.detail.value = text
  if (event?.target && event.target.value !== text) event.target.value = text
  return text
}

export function isWholeQuantity(value: unknown) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0
}
