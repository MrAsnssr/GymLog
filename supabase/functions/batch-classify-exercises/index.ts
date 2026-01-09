import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (user.email !== 'asnssrr@gmail.com') {
            return new Response(JSON.stringify({ error: 'Unauthorized admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        const { data: exercises, error: fetchError } = await supabase
            .from('exercises')
            .select('id, name, category')

        if (fetchError) throw fetchError
        if (!exercises || exercises.length === 0) {
            return new Response(JSON.stringify({ message: 'No exercises found', success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const exerciseList = exercises.map(ex => ({ id: ex.id, name: ex.name }))

        const prompt = `
      As a fitness expert, classify these gym exercises into exactly ONE category: Chest, Back, Legs, Shoulders, Arms, Core, Cardio.
      Names could be English or Arabic (e.g. "ليج اكستنشن" is Legs).
      
      Respond with ONLY a JSON object: { "results": [{ "id": "...", "category": "..." }] }
      Allowed Categories: Chest, Back, Legs, Shoulders, Arms, Core, Cardio.

      Data: ${JSON.stringify(exerciseList)}
    `

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'You are a precise fitness classifier. Response must be JSON.' }, { role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        })

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{"results":[]}')
        const classifications = aiResponse.results || []

        let updatedCount = 0
        const errors = []

        for (const item of classifications) {
            if (!item.id || !item.category) continue

            const validCategories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']
            const matchedCategory = validCategories.find(c => c.toLowerCase() === item.category.toLowerCase())

            if (!matchedCategory) continue

            const { error: updateError } = await supabase
                .from('exercises')
                .update({ category: matchedCategory })
                .eq('id', item.id)

            if (updateError) {
                errors.push({ id: item.id, error: updateError.message })
            } else {
                updatedCount++
            }
        }

        return new Response(JSON.stringify({
            success: true,
            count: updatedCount,
            total: exercises.length,
            errors: errors.length > 0 ? errors : undefined
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Batch classify error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
