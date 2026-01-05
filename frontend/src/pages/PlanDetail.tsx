import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WorkoutPlan, WorkoutPlanExercise, Exercise } from '../lib/types'
import { MainLayout } from '../components/layout/MainLayout'

const DAYS_OF_WEEK = [
  'common.sunday',
  'common.monday',
  'common.tuesday',
  'common.wednesday',
  'common.thursday',
  'common.friday',
  'common.saturday'
]

export function PlanDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [planExercises, setPlanExercises] = useState<WorkoutPlanExercise[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null)
  const [targetSets, setTargetSets] = useState('')
  const [targetReps, setTargetReps] = useState('')
  const [targetWeight, setTargetWeight] = useState('')

  useEffect(() => {
    if (id && user) {
      loadPlan()
      loadPlanExercises()
      loadExercises()
    }
  }, [id, user])

  const loadPlan = async () => {
    if (!id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (data) setPlan(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load workout plan')
    } finally {
      setLoading(false)
    }
  }

  const loadPlanExercises = async () => {
    if (!id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_plan_exercises')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('plan_id', id)
        .order('day_of_week', { ascending: true })
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError
      if (data) setPlanExercises(data as WorkoutPlanExercise[])
    } catch (err: any) {
      console.error('Error loading plan exercises:', err)
    }
  }

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

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !selectedExerciseId) return

    try {
      const { error: insertError } = await supabase
        .from('workout_plan_exercises')
        .insert({
          plan_id: id,
          exercise_id: selectedExerciseId,
          day_of_week: dayOfWeek,
          target_sets: targetSets ? parseInt(targetSets) : null,
          target_reps: targetReps ? parseInt(targetReps) : null,
          target_weight_lbs: targetWeight ? parseFloat(targetWeight) : null,
          order_index: planExercises.length,
        })

      if (insertError) throw insertError

      loadPlanExercises()
      setShowAddForm(false)
      setSelectedExerciseId('')
      setDayOfWeek(null)
      setTargetSets('')
      setTargetReps('')
      setTargetWeight('')
    } catch (err: any) {
      alert('Failed to add exercise: ' + err.message)
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm(t('common.confirm_delete' || 'Are you sure?'))) return

    try {
      const { error } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      loadPlanExercises()
    } catch (err: any) {
      alert('Failed to remove exercise: ' + err.message)
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

  if (error || !plan) {
    return (
      <MainLayout title={t('common.plans')} showAssistantStatus={false}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center bg-surface-dark p-12 rounded-3xl border border-surface-highlight">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <p className="text-white text-xl font-bold mb-6">{error || 'Workout plan not found'}</p>
            <Link to="/plans" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
              <span className="material-symbols-outlined">arrow_back</span>
              {t('plans.back_to_list' || 'Back to Plans')}
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Group exercises by day
  const exercisesByDay = planExercises.reduce((acc, pe) => {
    const dayLabel = pe.day_of_week !== null ? t(DAYS_OF_WEEK[pe.day_of_week]) : t('plans.unassigned' || 'Unassigned')
    if (!acc[dayLabel]) {
      acc[dayLabel] = []
    }
    acc[dayLabel].push(pe)
    return acc
  }, {} as Record<string, WorkoutPlanExercise[]>)

  return (
    <MainLayout
      title={t('common.plans')}
      showAssistantStatus={false}
      actions={
        <div className="flex items-center gap-3">
          <Link
            to={`/plans/${plan.id}/edit`}
            className="bg-surface-highlight/30 hover:bg-surface-highlight/50 text-white px-4 py-2 rounded-xl font-bold transition-all border border-surface-highlight shadow-sm"
          >
            {t('common.edit')}
          </Link>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary hover:bg-primary/90 text-surface-dark px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">{showAddForm ? 'close' : 'add'}</span>
            <span>{showAddForm ? t('common.cancel') : t('plans.add_exercise' || 'Add Exercise')}</span>
          </button>
        </div>
      }
    >
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-4xl mx-auto">
          {/* Plan Header */}
          <div className="mb-10 pb-8 border-b border-surface-highlight flex flex-col gap-4">
            <Link
              to="/plans"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('plans.all_plans' || 'All Plans')}
            </Link>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <h1 className="text-white text-4xl font-black tracking-tight uppercase leading-none">
                  {plan.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${plan.is_active
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(19,236,91,0.1)]'
                      : 'bg-surface-highlight/30 border-surface-highlight/50 text-text-muted'
                      }`}
                  >
                    {plan.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                  <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-70">
                    ID: {plan.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
            {plan.description && (
              <p className="text-text-muted italic bg-surface-highlight/10 p-4 rounded-xl border-l-4 border-primary/30 mt-2">"{plan.description}"</p>
            )}
          </div>

          {showAddForm && (
            <div className="bg-surface-dark border border-primary/20 rounded-3xl p-8 mb-8 shadow-2xl animate-[slideDown_0.3s_ease-out]">
              <h3 className="text-white text-xl font-black uppercase tracking-tight mb-6">{t('plans.add_to_plan' || 'Add Exercise to Plan')}</h3>
              <form onSubmit={handleAddExercise} className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                    {t('plans.select_exercise' || 'Exercise')} *
                  </label>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-medium"
                  >
                    <option value="" className="bg-surface-dark">{t('plans.choose_exercise' || 'Select exercise')}</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id} className="bg-surface-dark">
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('plans.day' || 'Day')}
                    </label>
                    <select
                      value={dayOfWeek ?? ''}
                      onChange={(e) => setDayOfWeek(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-medium"
                    >
                      <option value="" className="bg-surface-dark">{t('plans.any_day' || 'Any day')}</option>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <option key={index} value={index} className="bg-surface-dark">
                          {t(day)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('sessions.sets')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetSets}
                      onChange={(e) => setTargetSets(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-black text-lg shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('sessions.reps')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetReps}
                      onChange={(e) => setTargetReps(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-black text-lg shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
                      {t('sessions.weight')} (lbs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-black text-lg shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-surface-dark py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                  >
                    {t('plans.add_to_plan_btn' || 'Add Exercise')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-8 bg-surface-highlight/30 hover:bg-surface-highlight/50 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {planExercises.length === 0 ? (
            <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">format_list_bulleted</span>
              </div>
              <p className="text-text-muted mb-8">{t('plans.no_exercises' || 'No exercises in this plan yet. Add exercises above!')}</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
              >
                {t('plans.add_first_exercise' || 'Add your first exercise')}
                <span className="material-symbols-outlined">add_circle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(exercisesByDay).map(([day, dayExercises]) => (
                <div key={day} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 font-black">
                      <span className="material-symbols-outlined text-xl">event_available</span>
                    </div>
                    <h3 className="text-white text-xl font-black tracking-tight uppercase">{day}</h3>
                    <div className="flex-1 h-px bg-surface-highlight lg:ml-4"></div>
                  </div>

                  <div className="grid gap-3">
                    {dayExercises.map((pe) => {
                      const exercise = pe.exercise as Exercise
                      return (
                        <div key={pe.id} className="group bg-surface-dark/40 border border-surface-highlight hover:border-primary/20 rounded-2xl p-5 transition-all backdrop-blur-sm flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-xl bg-surface-highlight/20 flex items-center justify-center text-text-muted transition-colors">
                              <span className="material-symbols-outlined">exercise</span>
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg group-hover:text-primary transition-colors">{exercise?.name || 'Unknown'}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                {pe.target_sets && (
                                  <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-highlight/20 px-2 py-0.5 rounded-md">
                                    <span className="font-bold text-primary">{pe.target_sets}</span> {t('sessions.sets')}
                                  </div>
                                )}
                                {pe.target_reps && (
                                  <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-highlight/20 px-2 py-0.5 rounded-md">
                                    <span className="font-bold text-primary">{pe.target_reps}</span> {t('sessions.reps')}
                                  </div>
                                )}
                                {pe.target_weight_lbs && (
                                  <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-highlight/20 px-2 py-0.5 rounded-md">
                                    <span className="font-bold text-primary">{pe.target_weight_lbs}</span> <span className="uppercase text-[10px]">lbs</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExercise(pe.id)}
                            className="h-10 w-10 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      )
                    })}
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
