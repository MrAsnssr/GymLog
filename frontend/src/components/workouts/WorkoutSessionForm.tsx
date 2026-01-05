import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { WorkoutSession } from '../../lib/types'

interface WorkoutSessionFormProps {
  onSessionCreated?: (session: WorkoutSession) => void
  onCancel?: () => void
}

export function WorkoutSessionForm({ onSessionCreated, onCancel }: WorkoutSessionFormProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          session_date: new Date().toISOString(),
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (onSessionCreated && data) {
        onSessionCreated(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create workout session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-shake">
          <span className="material-symbols-outlined">error</span>
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label htmlFor="notes" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
          {t('sessions.notes' || 'Notes')} <span className="text-text-muted/40 font-bold lowercase">({t('common.optional')})</span>
        </label>
        <div className="relative group">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30 resize-none"
            placeholder={t('sessions.notes_placeholder' || 'How are you feeling? Any specific goals?')}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-surface-dark py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(19,236,91,0.2)] hover:shadow-[0_15px_40px_rgba(19,236,91,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-surface-dark border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>{t('sessions.start_workout' || 'Start Workout')}</span>
              <span className="material-symbols-outlined text-lg">bolt</span>
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-8 bg-surface-highlight/30 hover:bg-surface-highlight/50 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
