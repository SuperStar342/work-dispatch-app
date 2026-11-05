<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getToken } from '@/utils/auth'
import { syncPageTitle } from '@/i18n'
import { canAutoLoginWithDingTalk } from '@/utils/dingtalk'

onLaunch(() => {
  const user = useUserStore()
  user.hydrate()
  const pages = getCurrentPages()
  const route = '/' + ((pages[0] as any)?.route || '')
  // 每次从钉钉冷启动都重新换取当前钉钉用户身份，不能沿用设备中残留的密码登录 Token。
  if (canAutoLoginWithDingTalk() && route !== '/pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index' })
  } else if (!getToken() && route !== '/pages/login/index') {
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
