
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    console.log(`Seeding data for user: ${userId}`)
    const today = new Date()
    const days = ['Push Day', 'Pull Day', 'Leg Day', 'Rest', 'Push Day', 'Pull Day', 'Leg Day']

    // 1. Ensure Exercises (Using Service Role, no 403 here!)
    const commonEx = [
      { name: 'Bench Press', category: 'strength', muscle_groups: ['chest'] },
      { name: 'Lat Pulldown', category: 'strength', muscle_groups: ['back'] },
      { name: 'Squat', category: 'strength', muscle_groups: ['legs'] },
      { name: 'Deadlift', category: 'strength', muscle_groups: ['back'] },
      { name: 'Shoulder Press', category: 'strength', muscle_groups: ['shoulders'] },
    ]

    const exerciseMap: Record<string, string> = {}
    for (const ex of commonEx) {
      const { data: existing } = await supabase.from('exercises').select('id').eq('name', ex.name).maybeSingle()
      if (existing) {
        exerciseMap[ex.name] = existing.id
      } else {
        const { data: created } = await supabase.from('exercises').insert(ex).select('id').single()
        if (created) exerciseMap[ex.name] = created.id
      }
    }

    // 2. Loop through 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      const dateStr = date.toISOString()
      const dayName = days[i]

      // Create Day
      const { data: dayData } = await supabase.from('workout_days').insert({
        user_id: userId,
        name: dayName,
        satisfaction_level: 5,
        created_at: dateStr
      }).select().single()

      // Create Session & Sets
      if (dayName !== 'Rest' && dayData) {
        const { data: session } = await supabase.from('workout_sessions').insert({
          user_id: userId,
          session_date: dateStr,
          duration_minutes: 75,
          satisfaction_level: 5,
          technique: 'Good form',
          day_id: dayData.id
        }).select().single()

        if (session) {
          let target = []
          if (dayName === 'Push Day') target = ['Bench Press', 'Shoulder Press']
          else if (dayName === 'Pull Day') target = ['Lat Pulldown', 'Deadlift']
          else if (dayName === 'Leg Day') target = ['Squat']

          for (const exName of target) {
            const exId = exerciseMap[exName]
            if (!exId) continue
            for (let s = 1; s <= 3; s++) {
              await supabase.from('workout_sets').insert({
                session_id: session.id,
                exercise_id: exId,
                set_number: s,
                weight_lbs: 80 + (s * 20),
                reps: 10,
                satisfaction_level: 5,
                technique: 'Strict'
              })
            }
          }
        }
      }

      // Create 4 Food Logs
      const meals = [
        { type: 'breakfast', name: 'Oats & Whey', calories: 400, p: 30, c: 50, f: 10 },
        { type: 'lunch', name: 'Chicken Breast & Rice', calories: 600, p: 50, c: 70, f: 10 },
        { type: 'dinner', name: 'Lean Beef & Sweet Potato', calories: 700, p: 45, c: 60, f: 30 },
        { type: 'snack', name: 'Casein Shake', calories: 150, p: 30, c: 5, f: 1 }
      ]
      for (const m of meals) {
        await supabase.from('food_logs').insert({
          user_id: userId,
          meal_date: dateStr,
          meal_type: m.type,
          food_name: m.name,
          calories: m.calories,
          protein_g: m.p,
          carbs_g: m.c,
          fat_g: m.f
        })
      }

      // Body measurements
      await supabase.from('body_measurements').insert({
        user_id: userId,
        measurement_date: dateStr,
        weight_lbs: 185 - (i * 0.1),
        body_fat_percent: 17 - (i * 0.05),
        measurements: { waist: 34, chest: 43 }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})
