import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Resend API (Example email provider)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get all Pro users with weekly_email enabled
        const { data: proUsers } = await supabase
            .from('profiles')
            .select('user_id, email, display_name')
            .eq('is_pro', true)
            .eq('weekly_status_emails', true)

        if (!proUsers || proUsers.length === 0) {
            return new Response(JSON.stringify({ message: 'No users to email' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)

        for (const user of proUsers) {
            // Get weekly stats
            const { count: workoutCount } = await supabase
                .from('workout_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.user_id)
                .gte('session_date', lastWeek.toISOString())

            const { data: foodLogs } = await supabase
                .from('food_logs')
                .select('calories')
                .eq('user_id', user.user_id)
                .gte('meal_date', lastWeek.toISOString())

            const totalCals = foodLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0
            const avgCals = foodLogs && foodLogs.length > 0 ? Math.round(totalCals / 7) : 0

            console.log(`[WEEKLY EMAIL] Sending to ${user.email}: ${workoutCount} workouts, ${avgCals} avg cals`)

            // Here you would call your email service (e.g. Resend)
            if (RESEND_API_KEY) {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: 'Hazem <updates@musclelog.ai>',
                        to: [user.email],
                        subject: 'Your Weekly Fitness Summary 📊',
                        html: `
              <h1>Hi ${user.display_name || 'there'}!</h1>
              <p>Here is your summary for the past 7 days:</p>
              <ul>
                <li>💪 Workouts: <strong>${workoutCount}</strong> sessions</li>
                <li>🍎 Average Daily Intake: <strong>${avgCals} kcal</strong></li>
              </ul>
              <p>Keep up the great work! see you in the gym.</p>
            `,
                    }),
                })
            }
        }

        return new Response(JSON.stringify({ success: true, emailed: proUsers.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error('[WEEKLY EMAIL ERROR]', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
