import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import am from './locales/am.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am }
    },
    fallbackLng: 'am',
    supportedLngs: ['am', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cms_language'
    },
    interpolation: { escapeValue: false }
  })

// Keep <html lang="..."> in sync so Amharic font rules and screen readers pick it up
i18n.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng)
})

export default i18n
