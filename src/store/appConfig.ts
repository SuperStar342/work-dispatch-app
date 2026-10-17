import { defineStore } from 'pinia'
import { appConfig as envConfig } from '@/utils/config'

export const useAppConfig = defineStore('appConfig', {
  state: () => ({
    title: envConfig.title,
    leaderAliases: envConfig.leaderAliases,
  }),
})
