import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Exercise, WorkoutSet } from '../../lib/types'

interface SetLoggerProps {
  sessionId: string
  onSetAdded?: (set: WorkoutSet) => void
  onCancel?: () => void
}

export function SetLogger({ sessionId, onSetAdded, onCancel }: SetLoggerProps) {
  const { t } = useTranslation()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [setNumber, setSetNumber] = useState(1)
  const [weightLbs, setWeightLbs] = useState('')
  const [reps, setReps] = useState('')
  const [restSeconds, setRestSeconds] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (error) throw error
      if (data) setExercises(data)
    } catch (err: any) {
      console.error('Error loading exercises:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExerciseId) {
      setError(t('errors.select_exercise' || 'Please select an exercise'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('workout_sets')
        .insert({
          session_id: sessionId,
          exercise_id: selectedExerciseId,
          set_number: setNumber,
          weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
          reps: reps ? parseInt(reps) : null,
          rest_seconds: restSeconds ? parseInt(restSeconds) : null,
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (onSetAdded && data) {
        onSetAdded(data)
        // Reset form
        setSetNumber((prev) => prev + 1)
        setWeightLbs('')
        setReps('')
        setRestSeconds('')
        setNotes('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log set')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white text-xl font-black uppercase tracking-tight">{t('common.log_set' || 'Log Set')}</h3>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t('sessions.set' || 'Set')}</span>
          <span className="text-sm font-black text-white">#{setNumber}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-4 flex items-center gap-3 animate-shake">
          <span className="material-symbols-outlined">error</span>
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="exercise" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
          {t('plans.select_exercise' || 'Exercise')} *
        </label>
        <select
          id="exercise"
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
          required
          className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner"
        >
          <option value="" className="bg-surface-dark">{t('plans.choose_exercise' || 'Select exercise')}</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id} className="bg-surface-dark">
              {exercise.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="weight" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('sessions.weight' || 'Weight')} (lbs)
          </label>
          <input
            id="weight"
            type="number"
            step="0.5"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reps" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('sessions.reps' || 'Reps')}
          </label>
          <input
            id="reps"
            type="number"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
          <label htmlFor="rest" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('sessions.rest' || 'Rest')} (s)
          </label>
          <input
            id="rest"
            type="number"
            min="0"
            value={restSeconds}
            onChange={(e) => setRestSeconds(e.target.value)}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center"
            placeholder="60"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
          {t('sessions.notes' || 'Notes')}
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30 resize-none"
          placeholder={t('sessions.set_notes_placeholder' || 'Form felt great. Tough set!')}
        />
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
              <span>{t('common.log_set' || 'Log Set')}</span>
              <span className="material-symbols-outlined text-lg">add_task</span>
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
