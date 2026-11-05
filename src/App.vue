<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getToken } from '@/utils/auth'
import { syncPageTitle } from '@/i18n'

onLaunch(() => {
  const user = useUserStore()
  user.hydrate()
  const pages = getCurrentPages()
  const route = '/' + ((pages[0] as any)?.route || '')
  if (!getToken() && route !== '/pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index' })
  }
  syncPageTitle()
})

onShow(() => {
  const user = useUserStore()
  user.hydrate()
  syncPageTitle()
})
</script>

<style lang="scss">
@import './styles/tokens.scss';
</style>
