import { appConfig, STORAGE_KEYS } from './config'
import { t } from '@/i18n'
import { encodeBasic, getToken, getRefreshToken, setToken, setRefreshToken, clearAuth, parseJwt } from './auth'
import { getEnvelope } from './bladeAdapter'

type RequestOptions = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, any>
  data?: any
  header?: Record<string, string>
  isToken?: boolean
  silentError?: boolean
  timeout?: number
  /** Internal guard: retry an authenticated request at most once. */
  _authRetried?: boolean
}

let redirecting = false
let refreshPromise: Promise<boolean> | null = null

const isDingTalkSession = () => {
  const detail = parseJwt(getToken())?.detail
  return detail && typeof detail === 'object' && detail.login_source === 'dingtalk'
}

const qs = (params?: Record<string, any>) => {
  if (!params) return ''
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

const toLogin = (tip?: string) => {
  if (redirecting) return
  redirecting = true
  clearAuth()
  if (tip) uni.showToast({ title: tip, icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' })
    redirecting = false
  }, 300)
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const method = options.method || 'GET'
  const isToken = options.isToken !== false
  let url = options.url
  if (!/^https?:/.test(url) && !url.startsWith(appConfig.baseUrl)) {
    url = `${appConfig.baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }
  if (options.params) url += qs(options.params)

  const header: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Blade-Requested-With': 'BladeHttpRequest',
    'Tenant-Id': appConfig.tenantId,
    'Accept-Language': 'zh',
    Authorization: encodeBasic(appConfig.clientId, appConfig.clientSecret),
    ...(options.header || {}),
  }
  if (isToken) {
    const token = getToken()
    if (token) header[appConfig.tokenHeader] = `bearer ${token}`
  }

  const res = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url,
      method,
      data: options.data,
      header,
      timeout: options.timeout || 20000,
      success: resolve,
      fail: (err) => {
        const raw = String((err as any)?.errMsg || (err as any)?.message || err || '')
        const timedOut = /timeout/i.test(raw)
        const msg = timedOut ? t('err.timeout') : raw || t('err.network')
        reject(new Error(msg))
      },
    })
  })

  const status = res.statusCode || 0
  const body: any = res.data

  if (isToken && (status === 401 || /认证信息已过期|令牌已失效|令牌已过期|缺失令牌/.test(String(body?.msg || body?.error_description || '')))) {
    // 钉钉员工是独立的短期会话，不对应 Blade 用户表，不能走 refresh_token
    // 加载失败或令牌过期时回到登录页重新换取钉钉一次性授权码。
    const dingTalkSession = Boolean(isDingTalkSession())
    const refreshed = options._authRetried || dingTalkSession ? false : await tryRefresh()
    if (refreshed) return request({ ...options, _authRetried: true })
    if (dingTalkSession) {
      // The login page consumes this marker and waits for an explicit retry.
      // This guarantees that a backend validation failure cannot cause SSO -> 401 -> SSO forever.
      uni.setStorageSync(STORAGE_KEYS.dingAutoLoginBlocked, Date.now())
    }
    toLogin(t('err.expired'))
    throw new Error(t('err.expired'))
  }

  if (status >= 400 && status !== 200) {
    const msg = body?.msg || body?.error_description || body?.error || t('err.requestStatus', { status })
    if (/请求未授权|权限不足/.test(String(msg))) {
      if (!options.silentError) uni.showToast({ title: t('err.noMenu'), icon: 'none', duration: 2800 })
      throw new Error(msg)
    }
    if (!options.silentError) uni.showToast({ title: msg, icon: 'none' })
    throw new Error(msg)
  }

  const envelope = getEnvelope(body) || body
  if (envelope && typeof envelope === 'object' && envelope.success === false) {
    const msg = envelope.msg || envelope.error_description || t('err.request')
    if (!options.silentError) uni.showToast({ title: msg, icon: 'none' })
    throw new Error(msg)
  }
  return body as T
}

function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const url = `${appConfig.baseUrl}/blade-auth/oauth/token${qs({
      tenantId: appConfig.tenantId,
      refresh_token: refresh,
      grant_type: 'refresh_token',
      scope: 'all',
    })}`
    const res = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
      uni.request({
        url,
        method: 'POST',
        header: {
          'Tenant-Id': appConfig.tenantId,
          Authorization: encodeBasic(appConfig.clientId, appConfig.clientSecret),
        },
        success: resolve,
        fail: reject,
      })
    })
    const data: any = res.data
    const token = data?.access_token
    if (!token) return false
    setToken(token)
    if (data.refresh_token) setRefreshToken(data.refresh_token)
    return true
  } catch {
    return false
  }
}
