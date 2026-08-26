let registration: ServiceWorkerRegistration | null = null

export function rememberRegistration(next: ServiceWorkerRegistration | undefined): void {
  registration = next ?? null
}

async function currentRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration
  if (!('serviceWorker' in navigator)) return null
  registration = (await navigator.serviceWorker.getRegistration()) ?? null
  return registration
}

export type UpdateCheckResult = 'unsupported' | 'pending' | 'current' | 'failed'

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const reg = await currentRegistration()
  if (!reg) return 'unsupported'

  try {
    await reg.update()
  } catch {
    return 'failed'
  }

  return reg.waiting || reg.installing ? 'pending' : 'current'
}

/**
 * Entfernt Service Worker und Caches und lädt neu. Notbremse, wenn ein alter
 * Worker klemmt. IndexedDB und localStorage bleiben unangetastet, das Logbuch
 * überlebt also.
 */
export async function resetAppCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((entry) => entry.unregister()))
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  registration = null
  window.location.reload()
}
