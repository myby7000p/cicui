import { createI18n } from 'vue-i18n'
import { FALLBACK_LANGUAGE } from '@shared/language'
import { enUs } from '@/i18n/locales/en-us'
import { zhCn } from '@/i18n/locales/zh-cn'

export const i18n = createI18n({
  legacy: false,
  fallbackLocale: FALLBACK_LANGUAGE,
  locale: FALLBACK_LANGUAGE,
  messages: {
    'zh-cn': zhCn,
    'en-us': enUs
  }
})

type JoinPath<Prefix extends string, Key extends string> = Prefix extends '' ? Key : `${Prefix}.${Key}`

/**
 * Every dotted message path in the catalog. A label table typed against it cannot name a key that
 * does not exist, which is what building keys by string interpolation gave up.
 */
type PathsOf<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : { [K in keyof T & string]: PathsOf<T[K], JoinPath<Prefix, K>> }[keyof T & string]

export type MessageKey = PathsOf<typeof zhCn>
