import { request } from '@/utils/request'
import { appConfig } from '@/utils/config'
import { sm2Encrypt } from '@/utils/sm2'
import { unwrap } from '@/utils/bladeAdapter'
import { t } from '@/i18n'

export async function loginByPassword(username: string, password: string) {
  const encrypted = sm2Encrypt(password) || password
  const res: any = await request({
    url: '/blade-auth/oauth/token',
    method: 'POST',
    isToken: false,
    timeout: 60000,
    params: {
      tenantId: appConfig.tenantId,
      username,
      password: encrypted,
      grant_type: appConfig.grantType,
      scope: 'all',
      type: 'account',
    },
  })
  if (res?.error_description) throw new Error(res.error_description)
  if (res?.error) throw new Error(res.error_description || res.error || t('login.failed'))
  return res
}

export async function getUserInfo() {
  try {
    const res: any = await request({ url: '/blade-system/user/info', method: 'GET', silentError: true })
    return unwrap(res) || res
  } catch {
    const res: any = await request({ url: '/blade-auth/oauth/user-info', method: 'GET', silentError: true })
    return unwrap(res) || res
  }
}

export async function updatePassword(oldPassword: string, newPassword: string) {
  const res: any = await request({
    url: '/blade-system/user/update-password',
    method: 'POST',
    params: {
      oldPassword,
      newPassword,
      newPassword1: newPassword,
    },
  })
  return unwrap(res)
}

export async function logoutApi() {
  try {
    await request({ url: '/blade-auth/oauth/logout', method: 'GET', silentError: true, isToken: false })
  } catch {
    /* ignore */
  }
}
