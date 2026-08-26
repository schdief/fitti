export const supportsWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator

let sentinel: WakeLockSentinel | null = null

export function isWakeLockActive(): boolean {
  return sentinel !== null && !sentinel.released
}

export async function requestWakeLock(onRelease?: () => void): Promise<boolean> {
  if (!supportsWakeLock) return false
  if (isWakeLockActive()) return true

  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener(
      'release',
      () => {
        sentinel = null
        onRelease?.()
      },
      { once: true },
    )
    return true
  } catch {
    sentinel = null
    return false
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!sentinel) return
  const current = sentinel
  sentinel = null
  try {
    await current.release()
  } catch {
    // Bereits freigegeben – nichts zu tun.
  }
}
