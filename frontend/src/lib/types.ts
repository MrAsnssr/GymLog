export interface Profile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  phone_number: string | null
  notes: string | null
  gender: 'male' | 'female' | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  is_pro: boolean
  subscription_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  category: 'strength' | 'cardio' | 'flexibility' | 'other'
  muscle_groups: string[]
  description: string | null
  created_at: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  session_date: string
  duration_minutes: number | null
  notes: string | null
  day_id: string | null
  satisfaction_level: number | null
  technique: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  weight_lbs: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  notes: string | null
  satisfaction_level: number | null
  technique: string | null
  created_at: string
  exercise?: Exercise
}

export interface WorkoutPlan {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkoutPlanExercise {
  id: string
  plan_id: string
  exercise_id: string
  day_of_week: number | null
  target_sets: number | null
  target_reps: number | null
  target_weight_lbs: number | null
  order_index: number
  notes: string | null
  created_at: string
  exercise?: Exercise
}

export interface FoodLog {
  id: string
  user_id: string
  meal_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  serving_size: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BodyMeasurement {
  id: string
  user_id: string
  measurement_date: string
  weight_lbs: number | null
  body_fat_percent: number | null
  measurements: Record<string, number>
  notes: string | null
  created_at: string
}

export interface WorkoutDay {
  id: string
  user_id: string
  name: string
  notes: string | null
  satisfaction_level: number | null
  created_at: string
  updated_at: string
}


