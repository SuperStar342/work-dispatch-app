import { STORAGE_KEYS } from './config'

export function getToken() {
  return uni.getStorageSync(STORAGE_KEYS.token) || ''
}

export function setToken(token: string) {
  uni.setStorageSync(STORAGE_KEYS.token, token)
}

export function getRefreshToken() {
  return uni.getStorageSync(STORAGE_KEYS.refresh) || ''
}

export function setRefreshToken(token: string) {
  uni.setStorageSync(STORAGE_KEYS.refresh, token)
}

export function clearAuth() {
  uni.removeStorageSync(STORAGE_KEYS.token)
  uni.removeStorageSync(STORAGE_KEYS.refresh)
}

export function encodeBasic(clientId: string, clientSecret: string) {
  const raw = `${clientId}:${clientSecret}`
  try {
    if (typeof btoa === 'function') return `Basic ${btoa(raw)}`
  } catch {
    /* fallthrough */
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let output = ''
  let i = 0
  while (i < raw.length) {
    const c1 = raw.charCodeAt(i++)
    const c2 = i < raw.length ? raw.charCodeAt(i++) : NaN
    const c3 = i < raw.length ? raw.charCodeAt(i++) : NaN
    const e1 = c1 >> 2
    const e2 = ((c1 & 3) << 4) | ((c2 || 0) >> 4)
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | ((c3 || 0) >> 6)
    const e4 = isNaN(c3) ? 64 : c3 & 63
    output += chars.charAt(e1) + chars.charAt(e2) + (e3 === 64 ? '=' : chars.charAt(e3)) + (e4 === 64 ? '=' : chars.charAt(e4))
  }
  return `Basic ${output}`
}

export function parseJwt(token?: string): Record<string, any> {
  const t = token || getToken()
  if (!t || !t.includes('.')) return {}
  try {
    const part = t.split('.')[1]
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : ''
    return json ? JSON.parse(json) : {}
  } catch {
    return {}
  }
}
