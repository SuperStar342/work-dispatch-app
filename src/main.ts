import { createSSRApp } from 'vue'
import App from './App.vue'
import pinia from './store'
import { syncPageTitle } from './i18n'

export function createApp() {
  const app = createSSRApp(App)
  app.use(pinia)
  app.mixin({
    onShow() {
      syncPageTitle()
    },
  })
  return { app }
}
