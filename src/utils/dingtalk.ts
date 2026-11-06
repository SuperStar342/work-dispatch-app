import { appConfig } from './config'

type DingTalkAuthResult = { code?: string; authCode?: string }

const getCorpId = () => {
  if (typeof window === 'undefined') return appConfig.dingTalkCorpId
  try {
    return new URL(window.location.href).searchParams.get('corpid') || appConfig.dingTalkCorpId
  } catch {
    return appConfig.dingTalkCorpId
  }
}

export const isDingTalkContainer = () => {
  if (typeof navigator === 'undefined') return false
  return /DingTalk/i.test(navigator.userAgent || '')
}

export const canAutoLoginWithDingTalk = () =>
  appConfig.dingTalkAutoLogin && isDingTalkContainer() && Boolean(getCorpId())

/**
 * An H5 micro-app cannot switch the DingTalk client account itself. Close the
 * current micro-app when possible so the user can switch accounts in DingTalk,
 * then reopen the app from the workbench.
 */
export function closeForDingTalkAccountSwitch() {
  const dd = typeof window === 'undefined' ? undefined : window.dd
  const close = dd?.biz?.navigation?.close
  if (typeof close === 'function') {
    close({
      onFail: () => {
        if (typeof history !== 'undefined' && history.length > 1) history.back()
      },
    })
    return
  }
  if (typeof history !== 'undefined' && history.length > 1) history.back()
}

export function requestDingTalkAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const dd = typeof window === 'undefined' ? undefined : window.dd
    const corpId = getCorpId()
    if (!dd) {
      reject(new Error('钉钉 JSAPI 未加载，请从钉钉工作台重新打开应用'))
      return
    }
    if (!corpId) {
      reject(new Error('未获取到企业 CorpId，请检查钉钉应用首页地址配置'))
      return
    }

    const done = (result: DingTalkAuthResult) => {
      const code = result?.code || result?.authCode
      if (code) resolve(code)
      else reject(new Error('钉钉未返回免登授权码'))
    }
    const fail = (error: any) => {
      const message = error?.errorMessage || error?.message || error?.error || '钉钉免登授权失败'
      reject(new Error(`钉钉客户端获取授权码失败：${String(message)}`))
    }
    const invoke = () => {
      // blade-auth exchanges enterprise micro-app codes through
      // /topapi/v2/user/getuserinfo. Codes returned by the newer
      // dd.requestAuthCode belong to a different authorization flow and are
      // rejected by that endpoint as an invalid authorization type. Keep the
      // client ID in the build configuration, but request the matching
      // enterprise micro-app code here.
      const legacy = dd.runtime?.permission?.requestAuthCode
      if (typeof legacy !== 'function') {
        fail(new Error('当前钉钉版本不支持企业内部微应用免登，请升级钉钉后重试'))
        return
      }
      legacy({ corpId, onSuccess: done, onFail: fail })
    }

    if (typeof dd.ready === 'function') {
      if (typeof dd.error === 'function') dd.error(fail)
      dd.ready(invoke)
    } else {
      invoke()
    }
  })
}
