import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

interface MainLayoutProps {
    children: React.ReactNode
    title?: string
    showAssistantStatus?: boolean
    actions?: React.ReactNode
}

export function MainLayout({ children, title, showAssistantStatus = true, actions }: MainLayoutProps) {
    const { user, signOut } = useAuth()
    const { t, i18n } = useTranslation()

    const handleSignOut = async () => {
        await signOut()
        window.location.href = '/login'
    }

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en'
        i18n.changeLanguage(newLang)
    }

    return (
        <div className="flex flex-col h-screen w-full font-body bg-background-light dark:bg-background-dark text-slate-900 dark:text-white overflow-hidden antialiased selection:bg-primary selection:text-surface-dark">
            {/* Top Header */}
            <header className="h-18 min-h-[72px] flex items-center justify-between px-6 lg:px-10 border-b border-surface-highlight bg-surface-dark/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-2xl font-bold">bolt</span>
                        <h1 className="text-white text-xl font-bold tracking-tight font-display">MUSCLE LOG</h1>
                    </div>

                    {showAssistantStatus && (
                        <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-surface-highlight">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                            <span className="text-text-muted text-sm font-medium">{t('common.coach_hazzem')}</span>
                        </div>
                    )}

                    {!showAssistantStatus && title && (
                        <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-surface-highlight">
                            <span className="text-white text-sm font-bold">{title}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-highlight/40 border border-surface-highlight hover:border-primary/50 text-white transition-all text-sm font-bold shadow-sm"
                    >
                        <span className="text-lg leading-none">{i18n.language === 'en' ? '🇴🇲' : '🇺🇸'}</span>
                        <span className="hidden sm:inline">{i18n.language === 'en' ? 'العربية' : 'English'}</span>
                    </button>

                    {/* Settings */}
                    <Link
                        to="/profile"
                        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-highlight text-text-muted hover:text-white transition-colors"
                        title={t('common.settings')}
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                    </Link>

                    {/* User Avatar & Logout */}
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center text-surface-dark font-bold text-xs uppercase shadow-sm">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-highlight text-text-muted hover:text-white transition-colors"
                            title={t('common.logout')}
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>

                    {actions && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-surface-highlight">
                            {actions}
                        </div>
                    )}
                </div>
            </header>

            {/* Content Body */}
            <main className="flex-1 overflow-hidden relative bg-background-dark/95">
                {children}
            </main>
        </div>
    )
}
