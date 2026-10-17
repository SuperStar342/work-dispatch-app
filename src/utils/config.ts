export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || '员工报工',
  baseUrl: import.meta.env.VITE_APP_BASE_URL || '/api',
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || 'saber3',
  clientSecret: import.meta.env.VITE_OAUTH_CLIENT_SECRET || 'saber3_secret',
  tenantId: import.meta.env.VITE_TENANT_ID || '000000',
  sm2PublicKey:
    import.meta.env.VITE_SM2_PUBLIC_KEY ||
    '04cf6154930679840fdec32abd1ea591678a462ba59a32398de679e0011c84de35d3670c404ad1381875157a0710aee55090c6d87c7911d89ea6e362ad0db03d47',
  leaderAliases: String(import.meta.env.VITE_LEADER_ROLE_ALIASES || '班组长,leader')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  grantType: import.meta.env.VITE_LOGIN_GRANT_TYPE || 'password',
  tokenHeader: 'Blade-Auth',
}

export const STORAGE_KEYS = {
  token: 'wd-access-token',
  refresh: 'wd-refresh-token',
  user: 'wd-user',
  empNo: 'wd-emp-no',
  empName: 'wd-emp-name',
  empOwner: 'wd-emp-owner',
}
