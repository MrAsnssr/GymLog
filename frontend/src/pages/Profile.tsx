import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../lib/types'
import { MainLayout } from '../components/layout/MainLayout'
import AIPreferences from '../components/settings/AIPreferences'

export function ProfilePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError
      if (data) {
        setDisplayName(data.display_name || '')
        setPhoneNumber(data.phone_number || '')
        setGender(data.gender || '')
        setHeightCm(data.height_cm?.toString() || '')
        setWeightKg(data.weight_kg?.toString() || '')
        setAge(data.age?.toString() || '')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          phone_number: phoneNumber || null,
          gender: gender || null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          age: age ? parseInt(age) : null,
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      loadProfile()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-[0_0_15px_rgba(19,236,91,0.3)]"></div>
          <span className="text-primary font-display font-bold tracking-widest animate-pulse">LOADING</span>
        </div>
      </div>
    )
  }

  return (
    <MainLayout title={t('common.settings')} showAssistantStatus={false}>
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-dark border border-surface-highlight rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col items-center mb-10">
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center text-surface-dark font-black text-3xl uppercase shadow-lg mb-4 ring-4 ring-primary/20">
                {user?.email?.[0].toUpperCase()}
              </div>
              <h2 className="text-white text-2xl font-black tracking-tight">{displayName || user?.email?.split('@')[0]}</h2>
              <span className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-60 mt-1">{t('common.pro_member')}</span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-shake">
                <span className="material-symbols-outlined">error</span>
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-primary/10 border border-primary/20 text-primary px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-fadeIn">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-medium text-sm">{t('profile.update_success')}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest border-b border-surface-highlight pb-2">{t('profile.basic_info')}</h3>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                    {t('profile.email')}
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">alternate_email</span>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-12 pr-4 py-4 bg-surface-highlight/20 border border-surface-highlight/50 rounded-2xl text-text-muted cursor-not-allowed font-medium text-base opacity-70"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="displayName" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                    {t('profile.display_name')}
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg group-focus-within:text-primary transition-colors">badge</span>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30"
                      placeholder={t('profile.display_name_placeholder')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="phoneNumber" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                    {t('profile.phone_number')}
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg group-focus-within:text-primary transition-colors">call</span>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+968 1234 5678"
                      className="w-full pl-12 pr-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30"
                    />
                  </div>
                </div>
              </div>

              {/* Body Stats Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest border-b border-surface-highlight pb-2">{t('profile.body_stats')}</h3>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                    {t('profile.gender')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${gender === 'male' ? 'bg-primary border-primary text-surface-dark shadow-[0_5px_15px_rgba(19,236,91,0.2)]' : 'bg-surface-highlight/20 border-surface-highlight text-text-muted hover:border-text-muted/50'}`}
                    >
                      <span className="material-symbols-outlined text-lg">male</span>
                      {t('profile.male')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${gender === 'female' ? 'bg-primary border-primary text-surface-dark shadow-[0_5px_15px_rgba(19,236,91,0.2)]' : 'bg-surface-highlight/20 border-surface-highlight text-text-muted hover:border-text-muted/50'}`}
                    >
                      <span className="material-symbols-outlined text-lg">female</span>
                      {t('profile.female')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="age" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('profile.age')}
                    </label>
                    <input
                      id="age"
                      type="number"
                      min="10"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center placeholder:text-text-muted/30"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="height" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('profile.height')} (cm)
                    </label>
                    <input
                      id="height"
                      type="number"
                      min="100"
                      max="250"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="175"
                      className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center placeholder:text-text-muted/30"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="weight" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('profile.weight')} (kg)
                    </label>
                    <input
                      id="weight"
                      type="number"
                      min="30"
                      max="300"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="75"
                      className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center placeholder:text-text-muted/30"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-text-muted/50 font-bold uppercase tracking-wider pl-1">{t('profile.stats_hint')}</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary hover:bg-primary/90 text-surface-dark py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(19,236,91,0.2)] hover:shadow-[0_15px_40px_rgba(19,236,91,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{t('profile.save_changes')}</span>
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AI Preferences Section */}
          <div className="mt-8">
            <AIPreferences />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
