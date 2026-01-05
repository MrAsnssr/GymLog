import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WorkoutPlan } from '../lib/types'
import { format } from 'date-fns'
import { MainLayout } from '../components/layout/MainLayout'

export function PlanList() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPlans()
    }
  }, [user])

  const loadPlans = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      if (data) setPlans(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load workout plans')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(t('common.confirm_delete' || 'Are you sure?'))) return

    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadPlans()
    } catch (err: any) {
      alert('Failed to delete plan: ' + err.message)
    }
  }

  const handleToggleActive = async (plan: WorkoutPlan, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from('workout_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)

      if (error) throw error
      loadPlans()
    } catch (err: any) {
      alert('Failed to update plan: ' + err.message)
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
    <MainLayout
      title={t('common.plans')}
      showAssistantStatus={false}
      actions={
        <Link
          to="/plans/new"
          className="bg-primary hover:bg-primary/90 text-surface-dark px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>{t('common.new_plan' || 'New Plan')}</span>
        </Link>
      }
    >
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">edit_note</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{t('plans.empty_title' || 'No workout plans yet')}</h3>
              <p className="text-text-muted mb-8">{t('plans.empty_desc' || 'Create a custom plan to reach your goals faster.')}</p>
              <Link
                to="/plans/new"
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
              >
                {t('plans.create_first' || 'Create your first workout plan')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  to={`/plans/${plan.id}`}
                  className="group bg-surface-dark/50 border border-surface-highlight hover:border-primary/30 rounded-3xl p-8 transition-all backdrop-blur-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors tracking-tight uppercase">{plan.name}</h3>
                      <span className="text-xs text-text-muted font-bold tracking-widest uppercase opacity-70">
                        {t('plans.created', { date: format(new Date(plan.created_at), 'MMM d, yyyy') })}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${plan.is_active
                        ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(19,236,91,0.1)]'
                        : 'bg-surface-highlight/30 border-surface-highlight/50 text-text-muted'
                        }`}
                    >
                      {plan.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-text-muted text-sm line-clamp-2 mb-8 leading-relaxed italic">"{plan.description}"</p>
                  )}

                  <div className="mt-auto flex items-center gap-3">
                    <button
                      onClick={(e) => handleToggleActive(plan, e)}
                      className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${plan.is_active
                        ? 'bg-surface-highlight/40 hover:bg-surface-highlight/60 text-white'
                        : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                        }`}
                    >
                      <span className="material-symbols-outlined text-sm">{plan.is_active ? 'visibility_off' : 'visibility'}</span>
                      {plan.is_active ? t('plans.deactivate' || 'Deactivate') : t('plans.activate' || 'Activate')}
                    </button>
                    <Link
                      to={`/plans/${plan.id}/edit`}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-surface-highlight/30 hover:bg-surface-highlight/50 text-white transition-all border border-transparent hover:border-surface-highlight"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(plan.id, e)}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/10 hover:border-red-500/30"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
