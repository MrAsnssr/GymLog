import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WorkoutSession } from '../lib/types'
import { format } from 'date-fns'
import { MainLayout } from '../components/layout/MainLayout'

export function WorkoutHistory() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const loadSessions = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      if (data) setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load workout sessions')
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
        .from('workout_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadSessions()
    } catch (err: any) {
      alert('Failed to delete session: ' + err.message)
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
      title={t('common.sessions')}
      showAssistantStatus={false}
      actions={
        <Link
          to="/workouts/new"
          className="bg-primary hover:bg-primary/90 text-surface-dark px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>{t('common.new_session' || 'New Session')}</span>
        </Link>
      }
    >
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">history</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{t('sessions.empty_title' || 'No sessions yet')}</h3>
              <p className="text-text-muted mb-8">{t('sessions.empty_desc' || 'Your fitness journey starts here.')}</p>
              <Link
                to="/workouts/new"
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
              >
                {t('sessions.start_first' || 'Start your first workout')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/workouts/${session.id}`}
                  className="group bg-surface-dark/50 border border-surface-highlight hover:border-primary/30 rounded-2xl p-6 transition-all backdrop-blur-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-xl bg-surface-highlight/30 flex flex-col items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                      <span className="text-xs font-bold uppercase">{format(new Date(session.session_date), 'MMM')}</span>
                      <span className="text-xl font-display font-black leading-none">{format(new Date(session.session_date), 'd')}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg group-hover:text-primary transition-colors">
                        {format(new Date(session.session_date), 'h:mm a')}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        {session.duration_minutes && (
                          <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-highlight/20 px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            <span>{session.duration_minutes}m</span>
                          </div>
                        )}
                        <span className="text-xs text-text-muted">{session.notes ? session.notes : (t('sessions.no_notes' || 'No notes'))}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="h-10 w-10 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Delete session"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-all group-hover:translate-x-1">chevron_right</span>
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
