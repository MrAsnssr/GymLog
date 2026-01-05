import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { FoodLog } from '../lib/types'
import { format, parseISO } from 'date-fns'
import { FoodLogForm } from '../components/food/FoodLogForm'
import { MainLayout } from '../components/layout/MainLayout'

export function FoodHistory() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (user) {
      loadFoodLogs()
    }
  }, [user, dateFilter])

  const loadFoodLogs = async () => {
    if (!user) return

    setLoading(true)
    try {
      const startOfDay = new Date(dateFilter)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(dateFilter)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error: fetchError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('meal_date', startOfDay.toISOString())
        .lte('meal_date', endOfDay.toISOString())
        .order('meal_date', { ascending: false })

      if (fetchError) throw fetchError
      if (data) setFoodLogs(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load food logs')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm_delete' || 'Are you sure?'))) return

    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadFoodLogs()
    } catch (err: any) {
      alert('Failed to delete food log: ' + err.message)
    }
  }

  const handleFoodLogged = () => {
    loadFoodLogs()
    setShowAddForm(false)
  }

  // Group logs by meal type
  const logsByMealType = foodLogs.reduce((acc, log) => {
    if (!acc[log.meal_type]) {
      acc[log.meal_type] = []
    }
    acc[log.meal_type].push(log)
    return acc
  }, {} as Record<string, FoodLog[]>)

  const mealTypeLabels: Record<string, string> = {
    breakfast: t('food.breakfast' || 'Breakfast'),
    lunch: t('food.lunch' || 'Lunch'),
    dinner: t('food.dinner' || 'Dinner'),
    snack: t('food.snacks' || 'Snacks'),
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
      title={t('common.nutrition')}
      showAssistantStatus={false}
      actions={
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary hover:bg-primary/90 text-surface-dark px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">{showAddForm ? 'close' : 'add'}</span>
          <span>{showAddForm ? t('common.cancel') : t('common.log_food' || 'Log Food')}</span>
        </button>
      }
    >
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-4xl mx-auto">
          {/* Date Picker Section */}
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-surface-highlight">
            <div className="flex flex-col gap-1">
              <h3 className="text-white text-xl font-bold">{t('food.daily_logs' || 'Daily Logs')}</h3>
              <p className="text-text-muted text-sm">{format(parseISO(dateFilter), 'EEEE, MMMM do')}</p>
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-surface-dark border border-surface-highlight text-white px-4 py-2 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {showAddForm && (
            <div className="bg-surface-dark border border-primary/20 rounded-3xl p-8 mb-8 shadow-2xl animate-[slideDown_0.3s_ease-out]">
              <FoodLogForm
                onFoodLogged={handleFoodLogged}
                onCancel={() => setShowAddForm(false)}
                initialDate={parseISO(dateFilter)}
              />
            </div>
          )}

          {foodLogs.length === 0 ? (
            <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <span className="material-symbols-outlined text-4xl">restaurant_menu</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{t('food.empty_title' || 'No logs for this day')}</h3>
              <p className="text-text-muted mb-8">{t('food.empty_desc' || 'Start tracking your nutrition to hit your goals.')}</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
              >
                {t('food.log_first' || 'Log your first meal')}
                <span className="material-symbols-outlined">add_circle</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-8">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => (
                logsByMealType[mealType] && (
                  <div key={mealType} className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-2">
                      <span className="material-symbols-outlined text-primary text-xl">
                        {mealType === 'breakfast' && 'eco'}
                        {mealType === 'lunch' && 'lunch_dining'}
                        {mealType === 'dinner' && 'dinner_dining'}
                        {mealType === 'snack' && 'cookie'}
                      </span>
                      <h3 className="text-white text-lg font-black tracking-tight uppercase">{mealTypeLabels[mealType]}</h3>
                      <div className="flex-1 h-px bg-surface-highlight lg:ml-4"></div>
                    </div>

                    <div className="grid gap-3">
                      {logsByMealType[mealType].map((log) => (
                        <div key={log.id} className="group bg-surface-dark/40 border border-surface-highlight hover:border-primary/20 rounded-2xl p-5 transition-all backdrop-blur-sm flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-bold text-base">{log.food_name}</h4>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-text-muted">{format(parseISO(log.meal_date), 'h:mm a')}</span>
                              {log.serving_size && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-surface-highlight"></span>
                                  <span className="text-xs text-text-muted">{log.serving_size}</span>
                                </>
                              )}
                            </div>

                            {(log.calories || log.protein_g || log.carbs_g || log.fat_g) && (
                              <div className="flex gap-4 mt-3">
                                {log.calories && (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{t('food.calories')}</span>
                                    <span className="text-sm font-black text-primary">{log.calories}</span>
                                  </div>
                                )}
                                {log.protein_g && (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{t('food.protein')}</span>
                                    <span className="text-sm font-bold text-white">{log.protein_g}g</span>
                                  </div>
                                )}
                                {log.carbs_g && (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{t('food.carbs')}</span>
                                    <span className="text-sm font-bold text-white">{log.carbs_g}g</span>
                                  </div>
                                )}
                                {log.fat_g && (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{t('food.fat')}</span>
                                    <span className="text-sm font-bold text-white">{log.fat_g}g</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {log.notes && (
                              <p className="text-xs text-text-muted mt-3 italic bg-surface-highlight/10 p-2 rounded-lg border-l-2 border-primary/30">{log.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
