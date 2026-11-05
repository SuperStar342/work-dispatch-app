/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'sm-crypto'

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_BASE_URL: string
  readonly VITE_OAUTH_CLIENT_ID: string
  readonly VITE_OAUTH_CLIENT_SECRET: string
  readonly VITE_TENANT_ID: string
  readonly VITE_SM2_PUBLIC_KEY: string
  readonly VITE_LEADER_ROLE_ALIASES: string
  readonly VITE_LOGIN_GRANT_TYPE: string
}
