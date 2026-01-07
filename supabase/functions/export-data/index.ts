import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Check if Pro
        const { data: profile } = await supabase.from('profiles').select('is_pro').eq('user_id', user.id).single()
        if (!profile?.is_pro) {
            return new Response(JSON.stringify({ error: 'Pro subscription required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { type, format } = await req.json()
        let csvData = ''
        let fileName = ''

        if (type === 'workouts') {
            const { data: workouts } = await supabase
                .from('workout_sessions')
                .select('*, workout_sets(*, exercises(name))')
                .eq('user_id', user.id)
                .order('session_date', { ascending: false })

            if (format === 'csv') {
                const header = 'Date,Exercise,Weight,Reps\n'
                const rows = workouts?.flatMap(s =>
                    s.workout_sets?.map((set: any) =>
                        `${s.session_date},"${set.exercises?.name || 'Unknown'}",${set.weight_lbs},${set.reps}`
                    )
                ).join('\n')
                csvData = header + rows
                fileName = `workouts_export_${new Date().toISOString().split('T')[0]}.csv`
            }
        } else if (type === 'food') {
            const { data: foodLogs } = await supabase
                .from('food_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('meal_date', { ascending: false })

            if (format === 'csv') {
                const header = 'Date,Meal,Food,Calories,Protein,Carbs,Fat\n'
                const rows = foodLogs?.map(f =>
                    `${f.meal_date},${f.meal_type || 'snack'},"${f.food_name}",${f.calories},${f.protein_g},${f.carbs_g},${f.fat_g}`
                ).join('\n')
                csvData = header + rows
                fileName = `food_export_${new Date().toISOString().split('T')[0]}.csv`
            }
        }

        return new Response(csvData, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
