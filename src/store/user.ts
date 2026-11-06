import { defineStore } from 'pinia'
import { loginByPassword, loginByDingTalk, getUserInfo, logoutApi } from '@/api/auth'
import { appConfig, STORAGE_KEYS } from '@/utils/config'
import { parseJwt, setToken, setRefreshToken, clearAuth, getToken } from '@/utils/auth'
import { t } from '@/i18n'
import { resetAuditNotices } from '@/utils/auditNotice'

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
    loginSource: 'password' as 'password' | 'dingtalk',
  }),
  getters: {
    isLeader: (s) => isLeaderRole(s.roles),
    /** 钉钉免登始终使用员工本人数据范围，避免班组长角色切换到代报/公共列表。 */
    isOwnScope: (s) => s.loginSource === 'dingtalk' || !isLeaderRole(s.roles),
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
        this.loginSource = cached.loginSource === 'dingtalk' ? 'dingtalk' : 'password'
      }
      if (this.account) this.applyOwnedEmp()
    },
    async login(username: string, password: string) {
      resetAuditNotices()
      const data = await loginByPassword(username, password)
      await this.applyLoginResult(data, username, 'password')
    },
    async loginWithDingTalk(code: string) {
      resetAuditNotices()
      // 防止设备上残留的 Blade 密码登录刷新令牌混入钉钉员工会话。
      clearAuth()
      this.token = ''
      const data = await loginByDingTalk(code)
      await this.applyLoginResult(data, '', 'dingtalk')
    },
    async applyLoginResult(data: any, fallbackAccount = '', loginSource: 'password' | 'dingtalk' = 'password') {
      const token = data.access_token
      if (!token) throw new Error(t('login.noToken'))
      setToken(token)
      if (loginSource === 'password' && data.refresh_token) setRefreshToken(data.refresh_token)
      if (loginSource === 'dingtalk') uni.removeStorageSync(STORAGE_KEYS.refresh)
      this.token = token
      this.loginSource = loginSource
      const jwt = parseJwt(token)
      const dingDetail = loginSource === 'dingtalk' && jwt?.detail && typeof jwt.detail === 'object' ? jwt.detail : {}
      const dingEmployeeNo = String(dingDetail.employee_no || '')
      const dingEmployeeName = String(dingDetail.employee_name || '')
      this.account = dingEmployeeNo || jwt.account || jwt.user_name || fallbackAccount
      this.userName = dingEmployeeName || jwt.nick_name || jwt.real_name || jwt.user_name || this.account
      this.roles = splitRoles(jwt.role_name)
      if (loginSource !== 'dingtalk') {
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
        loginSource: this.loginSource,
      })
      uni.setStorageSync(STORAGE_KEYS.empNo, this.empNo)
      uni.setStorageSync(STORAGE_KEYS.empName, this.empName)
      if (this.account) uni.setStorageSync(STORAGE_KEYS.empOwner, this.account)
    },
    async logout() {
      // Explicit logout must win over the login page's DingTalk auto-login.
      // Keep the marker before calling the remote endpoint so a slow/offline
      // logout request cannot immediately sign the same DingTalk user in again.
      uni.setStorageSync(STORAGE_KEYS.dingAutoLoginBlocked, {
        reason: 'logout',
        at: Date.now(),
      })
      await logoutApi()
      resetAuditNotices()
      clearAuth()
      this.token = ''
      this.account = ''
      this.userName = ''
      this.roles = []
      this.empNo = ''
      this.empName = ''
      this.avatar = ''
      this.loginSource = 'password'
      uni.removeStorageSync(STORAGE_KEYS.user)
      uni.removeStorageSync(STORAGE_KEYS.empNo)
      uni.removeStorageSync(STORAGE_KEYS.empName)
      uni.removeStorageSync(STORAGE_KEYS.empOwner)
      uni.reLaunch({ url: '/pages/login/index' })
    },
  },
})
