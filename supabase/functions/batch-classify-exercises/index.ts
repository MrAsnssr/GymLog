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
            return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify admin status
        const { data: { user }, error: userError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: authHeader } }
        }).auth.getUser()

        if (userError || !user || user.email !== 'asnssrr@gmail.com') {
            return new Response(JSON.stringify({ error: 'Unauthorized admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        // Fetch all exercises
        const { data: exercises, error: fetchError } = await supabase
            .from('exercises')
            .select('id, name, category')

        if (fetchError) throw fetchError
        if (!exercises || exercises.length === 0) {
            return new Response(JSON.stringify({ message: 'No exercises found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const exerciseNames = exercises.map(ex => ex.name)

        const prompt = `
      I have a list of gym exercises. Please classify each one into exactly ONE of these categories:
      Chest, Back, Legs, Shoulders, Arms, Core, Cardio.

      Respond ONLY with a JSON array of objects, where each object has:
      "name": the original exercise name
      "category": the chosen category

      List of exercises:
      ${exerciseNames.join(', ')}
    `

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        })

        const responseContent = JSON.parse(completion.choices[0].message.content || '{}')

        let classifications = []
        if (Array.isArray(responseContent)) {
            classifications = responseContent
        } else if (responseContent.classifications) {
            classifications = responseContent.classifications
        } else if (responseContent.exercises) {
            classifications = responseContent.exercises
        } else {
            const arrays = Object.values(responseContent).find(v => Array.isArray(v))
            if (arrays) classifications = arrays
        }

        if (!Array.isArray(classifications) || classifications.length === 0) {
            console.error('Unexpected OpenAI response shape:', responseContent)
            throw new Error('Failed to parse classifications from AI')
        }

        // Update database
        const results = []
        for (const item of classifications) {
            const exercise = exercises.find(ex => ex.name.toLowerCase() === item.name.toLowerCase())
            if (exercise) {
                const { error: updateError } = await supabase
                    .from('exercises')
                    .update({ category: item.category })
                    .eq('id', exercise.id)

                results.push({ name: item.name, category: item.category, success: !updateError })
            }
        }

        return new Response(JSON.stringify({ success: true, count: results.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Batch classify error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
