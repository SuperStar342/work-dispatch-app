import { sm2 } from 'sm-crypto'
import { appConfig } from './config'

export function sm2Encrypt(plainText: string) {
  try {
    return sm2.doEncrypt(plainText, appConfig.sm2PublicKey, 0)
  } catch {
    return ''
  }
}
