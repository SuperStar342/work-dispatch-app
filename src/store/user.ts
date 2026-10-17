import { defineStore } from 'pinia'
import { loginByPassword, getUserInfo, logoutApi } from '@/api/auth'
import { appConfig, STORAGE_KEYS } from '@/utils/config'
import { parseJwt, setToken, setRefreshToken, clearAuth, getToken } from '@/utils/auth'
import { t } from '@/i18n'

const splitRoles = (roleName?: any) => {
  if (!roleName) return [] as string[]
  if (Array.isArray(roleName)) return roleName.map(String)
  return String(roleName)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const isLeaderRole = (roles: string[]) =>
  roles.some((r) => appConfig.leaderAliases.includes(String(r).trim().toLowerCase()))

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() as string,
    account: '',
    userName: '',
    roles: [] as string[],
    empNo: '',
    empName: '',
    avatar: '',
  }),
  getters: {
    isLeader: (s) => isLeaderRole(s.roles),
    loginName: (s) => s.userName || s.account || t('common.employee'),
    displayName: (s) => s.empName || s.userName || s.account || t('common.employee'),
  },
  actions: {
    applyOwnedEmp() {
      const owner = String(uni.getStorageSync(STORAGE_KEYS.empOwner) || '')
      if (this.account && owner === this.account) {
        this.empNo = uni.getStorageSync(STORAGE_KEYS.empNo) || this.account
        this.empName = uni.getStorageSync(STORAGE_KEYS.empName) || this.userName
        return
      }
      this.empNo = this.account
      this.empName = this.userName
    },
    hydrate() {
      const cached = uni.getStorageSync(STORAGE_KEYS.user)
      if (cached) {
        this.account = cached.account || ''
        this.userName = cached.userName || ''
        this.roles = cached.roles || []
        this.avatar = cached.avatar || ''
      }
      if (this.account) this.applyOwnedEmp()
    },
    async login(username: string, password: string) {
      const data = await loginByPassword(username, password)
      const token = data.access_token
      if (!token) throw new Error(t('login.noToken'))
      setToken(token)
      if (data.refresh_token) setRefreshToken(data.refresh_token)
      this.token = token
      const jwt = parseJwt(token)
      this.account = jwt.account || jwt.user_name || username
      this.userName = jwt.nick_name || jwt.real_name || jwt.user_name || this.account
      this.roles = splitRoles(jwt.role_name)
      try {
        const info: any = await getUserInfo()
        const u = info?.userInfo || info?.sysUser || info || {}
        this.account = u.account || this.account
        this.userName = u.realName || u.name || u.nickName || this.userName
        this.roles = splitRoles(u.roleName || info?.roles || this.roles)
        this.avatar = u.avatar || ''
      } catch {
        /* jwt fallback */
      }
      this.applyOwnedEmp()
      this.persist()
    },
    setEmp(empNo: string, empName?: string) {
      this.empNo = empNo
      if (empName) this.empName = empName
      this.persist()
    },
    persist() {
      uni.setStorageSync(STORAGE_KEYS.user, {
        account: this.account,
        userName: this.userName,
        roles: this.roles,
        avatar: this.avatar,
      })
      uni.setStorageSync(STORAGE_KEYS.empNo, this.empNo)
      uni.setStorageSync(STORAGE_KEYS.empName, this.empName)
      if (this.account) uni.setStorageSync(STORAGE_KEYS.empOwner, this.account)
    },
    async logout() {
      await logoutApi()
      clearAuth()
      this.token = ''
      this.account = ''
      this.userName = ''
      this.roles = []
      this.empNo = ''
      this.empName = ''
      this.avatar = ''
      uni.removeStorageSync(STORAGE_KEYS.user)
      uni.removeStorageSync(STORAGE_KEYS.empNo)
      uni.removeStorageSync(STORAGE_KEYS.empName)
      uni.removeStorageSync(STORAGE_KEYS.empOwner)
      uni.reLaunch({ url: '/pages/login/index' })
    },
  },
})
