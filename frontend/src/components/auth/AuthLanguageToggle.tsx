import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export function AuthLanguageToggle() {
    const { i18n } = useTranslation()

    const toggleLanguage = () => {
        const nextLang = i18n.language.startsWith('ar') ? 'en' : 'ar'
        i18n.changeLanguage(nextLang)
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr'
    }

    const isAr = i18n.language.startsWith('ar')

    return (
        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={toggleLanguage}
            className="fixed top-6 right-6 z-50 px-4 py-2 rounded-full bg-surface-dark/40 backdrop-blur-xl border border-white/10 text-white text-sm font-medium flex items-center gap-2 hover:bg-white/5 transition-all shadow-lg"
        >
            <span className="material-symbols-outlined text-primary text-xl">language</span>
            <span>{isAr ? '🇺🇸 English' : '🇴🇲 العربية'}</span>
        </motion.button>
    )
}
