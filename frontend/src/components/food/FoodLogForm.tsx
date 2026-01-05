import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { FoodLog } from '../../lib/types'

interface FoodLogFormProps {
  onFoodLogged?: (foodLog: FoodLog) => void
  onCancel?: () => void
  initialDate?: Date
}

export function FoodLogForm({ onFoodLogged, onCancel, initialDate }: FoodLogFormProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [foodName, setFoodName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [mealDate, setMealDate] = useState(
    initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [mealTime, setMealTime] = useState(
    new Date().toTimeString().slice(0, 5)
  )
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const mealDateTime = new Date(`${mealDate}T${mealTime}`).toISOString()

      const { data, error: insertError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          meal_date: mealDateTime,
          meal_type: mealType,
          food_name: foodName,
          calories: calories ? parseInt(calories) : null,
          protein_g: protein ? parseFloat(protein) : null,
          carbs_g: carbs ? parseFloat(carbs) : null,
          fat_g: fat ? parseFloat(fat) : null,
          serving_size: servingSize || null,
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (onFoodLogged && data) {
        onFoodLogged(data)
        // Reset form
        setFoodName('')
        setCalories('')
        setProtein('')
        setCarbs('')
        setFat('')
        setServingSize('')
        setNotes('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log food')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white text-xl font-black uppercase tracking-tight">{t('common.log_food' || 'Log Food')}</h3>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-4 flex items-center gap-3 animate-shake">
          <span className="material-symbols-outlined">error</span>
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="mealDate" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('common.date' || 'Date')} *
          </label>
          <input
            id="mealDate"
            type="date"
            required
            value={mealDate}
            onChange={(e) => setMealDate(e.target.value)}
            className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="mealTime" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('common.time' || 'Time')} *
          </label>
          <input
            id="mealTime"
            type="time"
            required
            value={mealTime}
            onChange={(e) => setMealTime(e.target.value)}
            className="w-full px-4 py-3 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="foodName" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
          {t('food.food_name' || 'Food Name')} *
        </label>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg group-focus-within:text-primary transition-colors">restaurant</span>
          <input
            id="foodName"
            type="text"
            required
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner placeholder:text-text-muted/30"
            placeholder={t('food.name_placeholder' || 'e.g. Arabic Bread')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="mealType" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
          {t('food.meal_type' || 'Meal Type')} *
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type as any)}
              className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${mealType === type ? 'bg-primary border-primary text-surface-dark shadow-[0_5px_15px_rgba(19,236,91,0.2)]' : 'bg-surface-highlight/20 border-surface-highlight text-text-muted hover:border-text-muted/50'}`}
            >
              {t(`food.${type}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="calories" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('food.calories' || 'Calories')}
          </label>
          <input
            id="calories"
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-black text-xl shadow-inner text-center"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="servingSize" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('food.serving_size' || 'Serving Size')}
          </label>
          <input
            id="servingSize"
            type="text"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            className="w-full px-4 py-4 bg-surface-highlight/30 border border-surface-highlight focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl text-white outline-none transition-all font-medium text-base shadow-inner text-center placeholder:text-text-muted/30"
            placeholder="e.g. 100g"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="protein" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('food.protein' || 'Protein')} (g)
          </label>
          <input
            id="protein"
            type="number"
            step="0.1"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-full px-4 py-3 bg-surface-highlight/20 border border-surface-highlight rounded-xl text-white outline-none focus:border-primary/50 transition-all font-bold text-center"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="carbs" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('food.carbs' || 'Carbs')} (g)
          </label>
          <input
            id="carbs"
            type="number"
            step="0.1"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="w-full px-4 py-3 bg-surface-highlight/20 border border-surface-highlight rounded-xl text-white outline-none focus:border-primary/50 transition-all font-bold text-center"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="fat" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">
            {t('food.fat' || 'Fat')} (g)
          </label>
          <input
            id="fat"
            type="number"
            step="0.1"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="w-full px-4 py-3 bg-surface-highlight/20 border border-surface-highlight rounded-xl text-white outline-none focus:border-primary/50 transition-all font-bold text-center"
            placeholder="0"
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
          placeholder={t('food.notes_placeholder' || 'Any notes about this meal?')}
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
              <span>{t('food.log_food_btn' || 'Log Food')}</span>
              <span className="material-symbols-outlined text-lg">restaurant_menu</span>
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
