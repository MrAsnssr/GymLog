import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WorkoutSession, WorkoutSet } from '../lib/types'
import { SetLogger } from '../components/workouts/SetLogger'
import { format } from 'date-fns'
import { MainLayout } from '../components/layout/MainLayout'

export function WorkoutDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSetLogger, setShowSetLogger] = useState(false)

  useEffect(() => {
    if (id && user) {
      loadSession()
      loadSets()
    }
  }, [id, user])

  const loadSession = async () => {
    if (!id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (data) setSession(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load workout session')
    } finally {
      setLoading(false)
    }
  }

  const loadSets = async () => {
    if (!id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_sets')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('session_id', id)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      if (data) setSets(data as WorkoutSet[])
    } catch (err: any) {
      console.error('Error loading sets:', err)
    }
  }

  const handleSetAdded = (newSet: WorkoutSet) => {
    setSets([...sets, newSet])
    setShowSetLogger(false)
  }

  const handleDeleteSet = async (setId: string) => {
    if (!confirm(t('common.confirm_delete' || 'Are you sure?'))) return

    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId)

      if (error) throw error
      loadSets()
    } catch (err: any) {
      alert('Failed to delete set: ' + err.message)
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

  if (error || !session) {
    return (
      <MainLayout title={t('common.sessions')} showAssistantStatus={false}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center bg-surface-dark p-12 rounded-3xl border border-surface-highlight">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <p className="text-white text-xl font-bold mb-6">{error || 'Workout session not found'}</p>
            <Link to="/workouts" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
              <span className="material-symbols-outlined">arrow_back</span>
              {t('sessions.back_to_history' || 'Back to History')}
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Group sets by exercise
  const setsByExercise = sets.reduce((acc, set) => {
    const exerciseName = (set.exercise as any)?.name || 'Unknown Exercise'
    if (!acc[exerciseName]) {
      acc[exerciseName] = []
    }
    acc[exerciseName].push(set)
    return acc
  }, {} as Record<string, WorkoutSet[]>)

  return (
    <MainLayout
      title={t('common.sessions')}
      showAssistantStatus={false}
      actions={
        <button
          onClick={() => setShowSetLogger(!showSetLogger)}
          className="bg-primary hover:bg-primary/90 text-surface-dark px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">{showSetLogger ? 'close' : 'add'}</span>
          <span>{showSetLogger ? t('common.cancel') : t('common.add_set' || 'Add Set')}</span>
        </button>
      }
    >
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-4xl mx-auto">
          {/* Session Header */}
          <div className="mb-10 pb-8 border-b border-surface-highlight flex flex-col gap-4">
            <Link
              to="/workouts"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('sessions.history' || 'History')}
            </Link>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-white text-3xl font-black tracking-tight uppercase">
                  {format(new Date(session.session_date), 'MMMM d, yyyy')}
                </h1>
                <span className="text-primary font-bold">{format(new Date(session.session_date), 'h:mm a')}</span>
              </div>
              {session.duration_minutes && (
                <div className="flex items-center gap-2 bg-surface-highlight/20 px-4 py-2 rounded-xl text-white font-bold text-sm">
                  <span className="material-symbols-outlined text-primary">timer</span>
                  <span>{session.duration_minutes} min</span>
                </div>
              )}
            </div>
            {session.notes && (
              <p className="text-text-muted italic bg-surface-highlight/10 p-4 rounded-xl border-l-4 border-primary/30 mt-2">"{session.notes}"</p>
            )}
          </div>

          {showSetLogger && (
            <div className="bg-surface-dark border border-primary/20 rounded-3xl p-8 mb-8 shadow-2xl animate-[slideDown_0.3s_ease-out]">
              <SetLogger
                sessionId={session.id}
                onSetAdded={handleSetAdded}
                onCancel={() => setShowSetLogger(false)}
              />
            </div>
          )}

          {sets.length === 0 ? (
            <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">fitness_center</span>
              </div>
              <p className="text-text-muted mb-8">{t('sessions.no_sets' || 'No sets logged yet. Add your first set above!')}</p>
              <button
                onClick={() => setShowSetLogger(true)}
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
              >
                {t('sessions.add_set' || 'Add your first set')}
                <span className="material-symbols-outlined">add_circle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(setsByExercise).map(([exerciseName, exerciseSets]) => (
                <div key={exerciseName} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                      <span className="material-symbols-outlined text-xl">exercise</span>
                    </div>
                    <h3 className="text-white text-xl font-black tracking-tight uppercase">{exerciseName}</h3>
                    <div className="flex-1 h-px bg-surface-highlight ml-4"></div>
                  </div>

                  <div className="bg-surface-dark/40 border border-surface-highlight rounded-3xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-surface-highlight">
                          <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{t('sessions.set')}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{t('sessions.weight')}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{t('sessions.reps')}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">{t('sessions.rest' || 'Rest')}</th>
                          <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-highlight">
                        {exerciseSets.map((set, idx) => (
                          <tr key={set.id} className="group hover:bg-surface-highlight/10 transition-colors">
                            <td className="px-6 py-4">
                              <span className="h-7 w-7 rounded-lg bg-surface-highlight/30 flex items-center justify-center text-white text-xs font-bold leading-none">
                                {set.set_number || idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white font-black">
                              {set.weight_lbs ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg">{set.weight_lbs}</span>
                                  <span className="text-[10px] text-text-muted uppercase font-bold">lbs</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-white font-black text-lg">
                              {set.reps || '-'}
                            </td>
                            <td className="px-6 py-4 text-text-muted text-sm font-medium">
                              {set.rest_seconds ? `${set.rest_seconds}s` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteSet(set.id)}
                                className="h-9 w-9 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all flex items-center justify-center ml-auto opacity-0 group-hover:opacity-100"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
