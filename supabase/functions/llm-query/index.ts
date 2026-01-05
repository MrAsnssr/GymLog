import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// Force deploy refresh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FunctionCall {
  name: string
  arguments: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client - pass auth header for user context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Get user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { query, user_id: providedUserId, history, userProfile } = await req.json()
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the authenticated user
    const userId = providedUserId || user.id

    // Initialize OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Define function schemas for OpenAI
    const functions = [
      {
        name: 'log_workout_sets',
        description: 'Log workout sets. MANDATORY: You must call this even for one set. Do not just talk.',
        parameters: {
          type: 'object',
          properties: {
            sets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exercise_name: { type: 'string', description: 'Name in English (e.g. Chest Press)' },
                  weight_lbs: { type: 'number', description: 'Weight in lbs (mandatory)' },
                  reps: { type: 'number', description: 'Reps (mandatory)' },
                  num_sets: { type: 'number', description: 'Number of sets (default 1)' }
                },
                required: ['exercise_name', 'weight_lbs', 'reps']
              }
            }
          },
          required: ['sets'],
        },
      },
      {
        name: 'log_food',
        description: 'Log food. MANDATORY: If the user ate something, call this.',
        parameters: {
          type: 'object',
          properties: {
            food_name: { type: 'string' },
            meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
            calories: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
          },
          required: ['food_name', 'meal_type'],
        },
      },
      {
        name: 'get_workout_history',
        description: 'Retrieve history.',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'get_food_logs',
        description: 'Retrieve food history.',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'get_statistics',
        description: 'Overall stats.',
        parameters: { type: 'object', properties: {} }
      },
    ]

    // Build user profile context string
    let userProfileContext = ''
    if (userProfile) {
      const parts = []
      if (userProfile.display_name) parts.push(`الاسم: ${userProfile.display_name}`)
      if (userProfile.gender) parts.push(`الجنس: ${userProfile.gender === 'male' ? 'ذكر' : 'أنثى'}`)
      if (userProfile.age) parts.push(`العمر: ${userProfile.age} سنة`)
      if (userProfile.height_cm) parts.push(`الطول: ${userProfile.height_cm} سم`)
      if (userProfile.weight_kg) parts.push(`الوزن: ${userProfile.weight_kg} كج`)

      if (parts.length > 0) {
        userProfileContext = `
USER PROFILE (معلومات المتدرب):
${parts.join(' | ')}
Use this information to personalize your advice. For example:
- Adjust calorie recommendations based on gender and weight
- Consider age when suggesting exercise intensity
- Use height/weight for BMI-related advice
- Address the user by their name if provided

`
      }
    }

    // Build messages with conversation history
    const systemMessage = {
      role: 'system',
      content: `${userProfileContext}
You are Coach Hazzem (كوتش حازم), a hyper-local, high-energy Omani fitness legend.

### 🔴 MANDATORY LOGGING PROTOCOL (CORE MISSION):
1. **TOOL FIRST**: If the user provides workout or food data (e.g. "I did 10 pushups", "I ate pizza"):
   - **YOU MUST CALL A TOOL.** DO NOT just talk.
   - **NEVER SAY "I SAVED IT"** unless you have actually triggered the tool.
2. **DATA RULES**:
   - **STRENGTH EXERCISES** (weights, machines): Require Weight + Reps.
   - **BODYWEIGHT EXERCISES** (pushups, pullups): Use weight_lbs=0, only need Reps.
   - **CARDIO EXERCISES** (treadmill, running, cycling): Use weight_lbs=0, reps=duration in minutes. Example: "30 min treadmill" -> weight_lbs: 0, reps: 30 (meaning 30 minutes).
   - If data is missing: **ASK** in Omani Arabic. Example: "كم دقيقة يا بطل؟" (How many minutes, champ?).
3. **ENGLISH DATA**: Always save exercise names in English (e.g. "Tafteeh" -> "Chest Fly", "مشي" -> "Treadmill Walk").

### 🇴🇲 PERSONA & DIALECT:
- **ALWAYS OMANI ARABIC.** "كفو", "وحش", "أفا عليك".
- **CONFIRMATION**: After a successful log, confirm exactly what you saved:
  For strength: "Exercise is [English Name], Weight is [X] lbs, [N] sets, [N] reps"
  For cardio: "Exercise is [English Name], Duration: [X] minutes"
  (Followed by Omani motivation).
- **MEMORY**: Always check the history. If you just asked for details and the user gave them, log it immediately.`
    }

    console.log('[DEBUG] Received history length:', history?.length)
    if (history?.length > 0) {
      console.log('[DEBUG] Last history item:', JSON.stringify(history[history.length - 1]))
    }

    // Use history if provided, otherwise just the current query
    // ENSURE the system message is always first and sticky
    const chatMessages = history && history.length > 0
      ? [systemMessage, ...history]
      : [systemMessage, { role: 'user', content: query }]

    // Double check: if the last message isn't the user's query, append it (fallback)
    const lastMsg = chatMessages[chatMessages.length - 1]
    if (lastMsg.role !== 'user' && history?.length > 0) {
      // This shouldn't happen if frontend sends full history, but safety net
      console.log('[DEBUG] Appending query manually as last message was not user')
      chatMessages.push({ role: 'user', content: query })
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      functions,
      function_call: 'auto',
    })

    const message = completion.choices[0].message

    if (!message.function_call) {
      return new Response(
        JSON.stringify({
          response: message.content,
          debug: { function_call: null }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Execute the function call
    const functionName = message.function_call.name
    const functionArgs = JSON.parse(message.function_call.arguments || '{}')

    console.log(`[DEBUG] Function called: ${functionName}`)
    console.log(`[DEBUG] Arguments:`, JSON.stringify(functionArgs))

    let result: any = {}
    let responseText = ''

    switch (functionName) {
      case 'get_workout_history': {
        const { data } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*)')
          .eq('user_id', userId)
          .order('session_date', { ascending: false })
          .limit(functionArgs.limit || 10)

        result = { workouts: data || [] }
        responseText = `Found ${data?.length || 0} workouts.`
        break
      }


      case 'get_food_logs': {
        const { data } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .order('meal_date', { ascending: false })
          .limit(20)

        result = { food_logs: data || [] }
        responseText = `Found ${data?.length || 0} food logs.`
        break
      }

      case 'log_food': {
        const { error } = await supabase
          .from('food_logs')
          .insert({
            user_id: userId,
            meal_date: new Date().toISOString().split('T')[0],
            meal_type: functionArgs.meal_type || 'snack',
            food_name: functionArgs.food_name,
            calories: functionArgs.calories || 0,
            protein_g: functionArgs.protein_g || 0,
            carbs_g: functionArgs.carbs_g || 0,
            fat_g: functionArgs.fat_g || 0
          })

        if (error) {
          console.error('[ERROR] log_food failed:', error)
          throw error
        }

        result = { success: true, logged: functionArgs }
        responseText = 'Food logged successfully.'
        break
      }

      case 'log_workout_sets': {
        console.log('[DEBUG] Executing log_workout_sets')
        const { sets } = functionArgs as {
          sets: Array<{
            exercise_name: string,
            weight_lbs: number,
            reps: number
          }>
        }

        if (!sets || !sets.length) {
          result = { success: false, error: 'No sets provided' }
          break;
        }

        // Get today's workout session
        const today = new Date().toISOString().split('T')[0]

        // Find existing session for today
        let { data: sessionData, error: sessionFetchError } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('session_date', today)
          .single()

        if (sessionFetchError && sessionFetchError.code !== 'PGRST116') {
          console.error('[ERROR] Failed to fetch session:', sessionFetchError)
          throw sessionFetchError
        }

        let sessionId = sessionData?.id

        // Create new session if none exists
        if (!sessionId) {
          try {
            console.log('[DEBUG] Creating new workout session for today')
            const { data: newSession, error: createError } = await supabase
              .from('workout_sessions')
              .insert({
                user_id: userId,
                session_date: today,
              })
              .select()
              .single()

            if (createError) throw createError
            sessionId = newSession.id
          } catch (sessionErr: any) {
            console.error('[ERROR] Failed to create session:', sessionErr)
            result = { success: false, error: `Session Critical Fail: ${sessionErr.message || JSON.stringify(sessionErr)}` }
            break; // Stop execution
          }
        }

        const loggedSets = []
        const failedSets = []

        // Loop through logged sets
        for (const setItem of sets) {
          const set = setItem as any
          const numSets = set.num_sets || 1

          // Create exercise if not exists
          const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('*')
            .ilike('name', set.exercise_name)
            .single()

          let exerciseId
          if (exercise) {
            exerciseId = exercise.id
          } else {
            // Create new exercise
            const { data: newExercise } = await supabase
              .from('exercises')
              .insert({
                name: set.exercise_name,
                category: 'other'
              })
              .select()
              .single()
            exerciseId = newExercise.id
          }

          // Expand sets based on num_sets
          let setSuccessCount = 0
          for (let i = 0; i < numSets; i++) {
            const { error: setError } = await supabase
              .from('workout_sets')
              .insert({
                session_id: sessionId,
                exercise_id: exerciseId,
                user_id: undefined, // Explicitly undefined to avoid schema mismatch
                set_number: i + 1, // Correct set number sequence 
                weight_lbs: set.weight_lbs,
                reps: set.reps,
              })

            if (setError) {
              console.error('Error logging set:', setError)
              // Don't break, try to log others
              failedSets.push({ set, error: setError.message, set_number: i + 1 })
            } else {
              setSuccessCount++
            }
          }

          if (setSuccessCount > 0) {
            loggedSets.push(`${set.exercise_name} (${setSuccessCount}/${numSets} sets)`)
          }
        }

        result = {
          success: loggedSets.length > 0,
          logged: loggedSets,
          failed: failedSets
        }
        responseText = `Logged ${loggedSets.length} sets. Failed: ${failedSets.length}.`
        break
      }

      case 'get_statistics': {
        const period = functionArgs.period || 'week'
        let startDate = new Date()
        if (period === 'week') startDate.setDate(startDate.getDate() - 7)
        else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1)

        const { count: workoutCount } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('session_date', startDate.toISOString())

        const { data: measurements } = await supabase
          .from('body_measurements')
          .select('weight_lbs, measurement_date')
          .eq('user_id', userId)
          .order('measurement_date', { ascending: false })
          .limit(7)

        result = { total_workouts: workoutCount || 0, measurements }
        responseText = `${workoutCount} workouts this ${period}.`
        break
      }

      default:
        responseText = 'Action not supported yet.'
    }

    // Get final response - STRICT VALIDATION
    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system', content: `You are Coach Hazzem (كوتش حازم).
CRITICAL INSTRUCTION:
Check the "Data" JSON below carefully.
- IF "success": true AND "logged" data is present: Confirm specifically what was saved (e.g. "سجلت لك [Exercise Name]").
- IF "success" is missing or false: Apologize in Arabic and say you couldn't save it ("السموحة يا وحش، ما قدرت أسجلها...").
- IF "logged" data is missing items the user asked for: Apologize for the missing items.
- ALWAYS speak Omani Arabic.` },
        { role: 'user', content: `User query: "${query}". Data: ${JSON.stringify(result)}. Respond naturally based on the data.` },
      ],
    })

    // Track Token Usage
    const usage = finalCompletion.usage
    if (usage && userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ai_usage_token_count')
          .eq('user_id', userId)
          .single()

        const currentCount = profile?.ai_usage_token_count || 0
        const newCount = currentCount + usage.total_tokens

        await supabase
          .from('profiles')
          .update({ ai_usage_token_count: newCount })
          .eq('user_id', userId)

        console.log(`[USAGE] User ${userId} used ${usage.total_tokens} tokens. Total: ${newCount}`)
      } catch (tokenErr) {
        console.error('[USAGE ERROR] Failed to update token count:', tokenErr)
      }
    }

    return new Response(
      JSON.stringify({
        response: finalCompletion.choices[0].message.content,
        data: result,
        debug: {
          function_call: message.function_call
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})