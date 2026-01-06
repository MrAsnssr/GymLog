import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AuthLanguageToggle } from '../components/auth/AuthLanguageToggle'

export function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background-dark font-body">
      <AuthLanguageToggle />
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/background.png"
          alt="Gym Background"
          className="h-full w-full object-cover opacity-30 scale-105 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-transparent to-background-dark/90"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] px-6 mx-auto"
      >
        <div className="bg-surface-dark/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 sm:p-10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
          {/* Logo / Title Section */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6"
            >
              <span className="material-symbols-outlined text-primary text-4xl">fitness_center</span>
            </motion.div>
            <h2 className="text-3xl font-bold font-display text-white mb-2 tracking-tight">
              {t('auth.welcome_back')}
            </h2>
            <p className="text-text-muted text-sm px-4">
              {t('auth.login_prompt')}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest ps-4">
                  {t('auth.email')}
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 start-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full bg-background-dark/50 border border-white/5 rounded-2xl py-3.5 ps-12 pe-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-base"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest ps-4">
                  {t('auth.password')}
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 start-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </span>
                  <input
                    type="password"
                    required
                    className="w-full bg-background-dark/50 border border-white/5 rounded-2xl py-3.5 ps-12 pe-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-base"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-surface-dark font-bold py-4 rounded-2xl transition-all shadow-[0_8px_20px_-4px_rgba(19,236,91,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(19,236,91,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-8"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-surface-dark/30 border-t-surface-dark rounded-full animate-spin"></div>
                  <span>{t('auth.signing_in')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.sign_in')}</span>
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 group-hover:rtl:-translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>

            <div className="text-center pt-4">
              <Link
                to="/signup"
                className="text-text-muted hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
              >
                {t('auth.no_account')} <span className="text-primary font-bold">{t('auth.signup')}</span>
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}


