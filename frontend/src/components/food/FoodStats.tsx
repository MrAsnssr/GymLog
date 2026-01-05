import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns'

interface FoodStatsProps {
  period: 'today' | 'week'
}

export function FoodStats({ period }: FoodStatsProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    mealCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user, period])

  const loadStats = async () => {
    if (!user) return

    setLoading(true)
    try {
      let startDate: Date
      let endDate = new Date()

      if (period === 'today') {
        startDate = startOfDay(new Date())
        endDate = endOfDay(new Date())
      } else {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 })
      }

      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('meal_date', startDate.toISOString())
        .lte('meal_date', endDate.toISOString())

      if (error) throw error

      const totals = (data || []).reduce(
        (acc, log) => ({
          totalCalories: acc.totalCalories + (log.calories || 0),
          totalProtein: acc.totalProtein + (log.protein_g || 0),
          totalCarbs: acc.totalCarbs + (log.carbs_g || 0),
          totalFat: acc.totalFat + (log.fat_g || 0),
          mealCount: acc.mealCount + 1,
        }),
        {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          mealCount: 0,
        }
      )

      setStats(totals)
    } catch (err: any) {
      console.error('Error loading food stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading stats...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {period === 'today' ? 'Today' : 'This Week'} Nutrition
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-500">Calories</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCalories}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Protein</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProtein.toFixed(1)}g</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Carbs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCarbs.toFixed(1)}g</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Fat</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalFat.toFixed(1)}g</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">Meals Logged</p>
        <p className="text-xl font-semibold text-gray-900">{stats.mealCount}</p>
      </div>
    </div>
  )
}


