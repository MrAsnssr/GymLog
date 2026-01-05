import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainLayout } from '../components/layout/MainLayout'

export function PlanEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(id !== 'new')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id && id !== 'new') {
      loadPlan()
    } else {
      setPageLoading(false)
    }
  }, [id])

  const loadPlan = async () => {
    if (!id || !user) return

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError
      if (data) {
        setName(data.name)
        setDescription(data.description || '')
        setIsActive(data.is_active)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workout plan')
    } finally {
      setPageLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      if (id === 'new') {
        const { data, error: insertError } = await supabase
          .from('workout_plans')
          .insert({
            user_id: user.id,
            name,
            description: description || null,
            is_active: isActive,
          })
          .select()
          .single()

        if (insertError) throw insertError
        if (data) {
          navigate(`/plans/${data.id}`)
        }
      } else {
        const { error: updateError } = await supabase
          .from('workout_plans')
          .update({
            name,
            description: description || null,
            is_active: isActive,
          })
          .eq('id', id)

        if (updateError) throw updateError
        navigate(`/plans/${id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save workout plan')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
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
    <MainLayout title={t('common.plans')} showAssistantStatus={false}>
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 flex flex-col gap-4">
            <Link
              to="/plans"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('plans.all_plans' || 'All Plans')}
            </Link>
            <h1 className="text-white text-3xl font-black tracking-tight uppercase">
              {id === 'new' ? t('plans.create_new' || 'Create Workout Plan') : t('plans.edit_plan' || 'Edit Workout Plan')}
            </h1>
          </div>

          <div className="bg-surface-dark border border-surface-highlight rounded-3xl p-8 lg:p-10 shadow-2xl backdrop-blur-sm">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-shake">
                <span className="material-symbols-outlined">error</span>
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                  {t('plans.plan_name' || 'Plan Name')} *
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg group-focus-within:text-primary transition-colors">edit_note</span>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30"
                    placeholder={t('plans.name_placeholder' || 'e.g. Hypertrophy Split')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="description" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                  {t('plans.description' || 'Description')}
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30 resize-none"
                  placeholder={t('plans.desc_placeholder' || 'What is this plan for?')}
                />
              </div>

              <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsActive(!isActive)}>
                <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${isActive ? 'bg-primary border-primary shadow-[0_0_10px_rgba(19,236,91,0.3)]' : 'border-surface-highlight bg-surface-highlight/20'}`}>
                  {isActive && <span className="material-symbols-outlined text-surface-dark text-lg font-black leading-none">check</span>}
                </div>
                <label htmlFor="isActive" className="text-sm text-text-muted font-bold cursor-pointer group-hover:text-white transition-colors">
                  {t('plans.mark_active' || 'Mark as active plan')}
                </label>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-surface-dark py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(19,236,91,0.2)] hover:shadow-[0_15px_40px_rgba(19,236,91,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{t('plans.save_plan' || 'Save Plan')}</span>
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">save</span>
                    </>
                  )}
                </button>
                <Link
                  to="/plans"
                  className="px-8 bg-surface-highlight/30 hover:bg-surface-highlight/50 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('common.cancel')}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
