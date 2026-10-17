export const TAB_PAGES = ['/pages/home/index', '/pages/task/index', '/pages/record/index', '/pages/mine/index']

export function goTab(url: string) {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = '/' + ((current as any)?.route || '')
  if (route === url) return
  uni.redirectTo({ url })
}

export function go(url: string) {
  uni.navigateTo({ url })
}

export function replace(url: string) {
  uni.redirectTo({ url })
}

export function reLaunch(url: string) {
  uni.reLaunch({ url })
}

export function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages/home/index' })
}

export function encodeQuery(params: Record<string, any>) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&')
}
