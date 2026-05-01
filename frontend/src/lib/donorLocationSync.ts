import { donor as donorApi } from '../services/api'

/** Minimum delay between server updates (battery + load). */
export const DONOR_LOCATION_PUSH_INTERVAL_MS = 8000

let lastPushAt = 0

/**
 * Sends the donor's current GPS to the API so hospitals / matching use the real position,
 * not the coordinates saved at registration.
 */
export async function pushDonorGpsToServer(
  lat: number,
  lng: number,
  opts?: { force?: boolean },
): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  const now = Date.now()
  if (!opts?.force && now - lastPushAt < DONOR_LOCATION_PUSH_INTERVAL_MS) return
  try {
    await donorApi.updateLocation(lat, lng)
    lastPushAt = Date.now()
  } catch {
    // Avoid spamming toasts; map still works locally. Retry allowed after interval.
  }
}
