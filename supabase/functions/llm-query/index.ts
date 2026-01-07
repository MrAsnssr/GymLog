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
    const { query, user_id: providedUserId, history, userProfile, isPro, currentTime, currentLanguage } = await req.json()
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

    // Fetch user profile with personalization settings
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('is_pro, weight_unit, ai_language, calorie_goal, protein_goal, carb_goal, fat_goal, custom_instructions, predict_nutrients')
      .eq('user_id', userId)
      .single()

    // Verify subscription status if Pro is requested
    const effectiveIsPro = isPro && (dbProfile?.is_pro || false)

    // Get personalization settings
    const weightUnit = dbProfile?.weight_unit || 'lbs'
    // Prioritize currentLanguage from UI if provided, then profile, then default
    const aiLanguage = (currentLanguage?.startsWith('ar') ? 'ar' : currentLanguage?.startsWith('en') ? 'en' : null) || dbProfile?.ai_language || 'ar'
    const customInstructions = effectiveIsPro ? (dbProfile?.custom_instructions || '') : ''
    const goals = effectiveIsPro ? {
      calories: dbProfile?.calorie_goal,
      protein: dbProfile?.protein_goal,
      carbs: dbProfile?.carb_goal,
      fat: dbProfile?.fat_goal
    } : null

    const predictNutrients = effectiveIsPro && (dbProfile?.predict_nutrients || false)


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
            meal_type: {
              type: 'string',
              enum: ['breakfast', 'lunch', 'dinner', 'snack'],
              description: 'Pick intelligently based on current time AND food context provided in system prompt.'
            },
            calories: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
          },
          required: ['food_name'],
        },
      },
      {
        name: 'update_ai_preferences',
        description: 'Update user settings like language or weight unit.',
        parameters: {
          type: 'object',
          properties: {
            ai_language: { type: 'string', enum: ['ar', 'en', 'auto'] },
            weight_unit: { type: 'string', enum: ['lbs', 'kg'] },
            predict_nutrients: { type: 'boolean' }
          }
        }
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
      {
        name: 'log_body_measurement',
        description: 'Record user weight or body fat. Use kg or lbs as provided.',
        parameters: {
          type: 'object',
          properties: {
            weight: { type: 'number' },
            unit: { type: 'string', enum: ['kg', 'lbs'] },
            body_fat_percent: { type: 'number' }
          },
          required: ['weight', 'unit']
        }
      }
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

    // Build goals context for Pro users
    let goalsContext = ''
    if (goals && (goals.calories || goals.protein || goals.carbs || goals.fat)) {
      const goalParts = []
      if (goals.calories) goalParts.push(`Calories: ${goals.calories} kcal`)
      if (goals.protein) goalParts.push(`Protein: ${goals.protein}g`)
      if (goals.carbs) goalParts.push(`Carbs: ${goals.carbs}g`)
      if (goals.fat) goalParts.push(`Fat: ${goals.fat}g`)
      goalsContext = `\nUSER GOALS: ${goalParts.join(', ')}\nAfter logging food, mention daily totals vs goals if known.`
    }

    // Build custom instructions context for Pro users
    const customInstructionsContext = customInstructions
      ? `\n\n### USER CUSTOM INSTRUCTIONS (FOLLOW THESE):\n${customInstructions}`
      : ''

    // Build messages with conversation history
    const systemMessage = {
      role: 'system',
      content: `${userProfileContext}${goalsContext}
You are Hazem, a focused and helpful Omani gym assistant. You are here to help the user track their legacy and gains. Every set and every meal matters. You are precise but you have a "gym comrade" soul. Speak naturally in Omani Arabic. NEVER give health or medical advice.

CURRENT LOCAL TIME: ${currentTime || new Date().toISOString()}

${effectiveIsPro ? 'As the Pro version, you use the advanced GPT-5.2 model for superior precision and complex multi-set logic.' : 'You are the base version using GPT-5 Mini for fast, efficient logging.'}

### LOGGING RULES:
1. If user provides normal workout or food data, CALL THE TOOL immediately. Don't talk about it.
2. If data is RIDICULOUS (eating a giraffe, benching 1000kg, etc), DO NOT call the tool. Instead, ask the user if they are serious with a skeptical Omani vibe.
2. Data requirements:
   - Weights/machines: Need weight + reps
   - Bodyweight (pushups, etc): weight_lbs=0, just reps
   - Cardio: weight_lbs=0, reps=minutes
   - Food logging (Picking meal_type):
     - Look at the FOOD and the TIME.
     - 05:00 - 11:00: Usually Breakfast
     - 11:00 - 16:00 (4 PM): Usually Lunch
     - 16:00 - 05:00: Usually Dinner
     - IMPORTANT: If user says they ate a "full chicken" or a heavy meal, it is NOT a snack. Even at 3 PM, "full chicken" is Lunch. Even at 6 PM, it is Dinner.
     - Only use 'snack' for small items (fruit, chocolate, protein bar, coffee).
     ${predictNutrients
          ? 'If the user provides a food name but omits macros (calories, protein, etc), PREDICT/ESTIMATE them yourself based on common servings. DO NOT ASK the user for them.'
          : 'If macros are missing, ask the user briefly: "كم سعرة؟"'
        }
3. Missing data? Just ask briefly: "كم؟" or "الوزن?"
4. Save exercise names in English.
5. Weight unit preference: ${weightUnit}
### DATA VALIDATION & RIDICULOUSNESS CHECK:
- If reps > 30 for heavy lifts (bench, squat, deadlift), ask to confirm.
- If weight seems extreme (>500 lbs), ask to confirm.
- RIDICULOUS INPUTS: If user says they ate a "giraffe", "elephant", or "truck", DO NOT LOG IT. Ask first: "زرافة عاد؟ متأكد؟".

### LANGUAGE & PREFERENCES:
- PREFERENCE: ${aiLanguage} (ar=Arabic, en=English, auto=No preference/Mixed)
- If language is 'auto', respond in the language the user used, or mix them naturally (Arabic with English terms).
- USER CAN CHANGE SETTINGS: If user says "كلمني انجليزي" or "Switch to English", update the preference using 'update_ai_preferences' AND immediately switch your language.
- Speak ${aiLanguage === 'en' ? 'English' : aiLanguage === 'ar' ? 'Omani Arabic' : 'Omani Arabic (mixed with English)'} naturally.

### RESPONSE STYLE:
- Be brief, but you are not a machine. Acknowledge the hard work.
- SKEPTICISM: If the input is weird or impossible, show it. "صدقك؟" or "تمزح؟".
- After logging: confirm the data clearly.
- No "coaching" (don't tell them how to lift), but you can be a "gym bro" (supportive talk is fine).
- NEVER give medical advice.${customInstructionsContext}`
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

    // Build tools from functions
    const tools = functions.map(f => ({
      type: 'function' as const,
      function: f
    }))

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: effectiveIsPro ? 'gpt-5.2' : 'gpt-5-mini',
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    })

    const message = completion.choices[0].message

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return new Response(
        JSON.stringify({
          response: message.content,
          debug: { tool_calls: null }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process all tool calls in parallel/batch
    const results = []
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}')

      console.log(`[DEBUG] Tool called: ${functionName}`)
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
              // Fetch history context for this exercise (Pro Only)
              let historyContext = null
              if (effectiveIsPro) {
                const { data: lastSessions } = await supabase
                  .from('workout_sets')
                  .select('weight_lbs, reps, workout_sessions!inner(session_date)')
                  .eq('exercise_id', exerciseId)
                  .lt('workout_sessions.session_date', today)
                  .order('created_at', { ascending: false })
                  .limit(10)

                if (lastSessions && lastSessions.length > 0) {
                  historyContext = lastSessions.map((s: any) => ({
                    date: s.workout_sessions.session_date,
                    weight: s.weight_lbs,
                    reps: s.reps
                  }))
                }
              }

              loggedSets.push({
                name: set.exercise_name,
                sets_count: setSuccessCount,
                planned_sets: numSets,
                weight: set.weight_lbs,
                reps: set.reps,
                history: historyContext
              })
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

        case 'log_body_measurement': {
          const { weight, unit, body_fat_percent } = functionArgs
          const weight_kg = unit === 'kg' ? weight : (weight / 2.20462)
          const weight_lbs = unit === 'lbs' ? weight : (weight * 2.20462)

          // Update profile for quick access
          await supabase
            .from('profiles')
            .update({ weight_kg })
            .eq('user_id', userId)

          // Log in history
          const { error } = await supabase
            .from('body_measurements')
            .insert({
              user_id: userId,
              weight_lbs,
              body_fat_percent,
              measurement_date: new Date().toISOString()
            })

          if (error) throw error

          result = { success: true, logged: { weight, unit, body_fat_percent } }
          responseText = `Recorded weight: ${weight}${unit}.`
          break
        }

        default:
          responseText = 'Action not supported yet.'
      }

      results.push({
        tool_call_id: toolCall.id,
        function_name: functionName,
        result
      })
    }

    // Final consolidated response
    const systemPromptLang = aiLanguage === 'ar'
      ? 'Speak ONLY in Omani Arabic.'
      : aiLanguage === 'en'
        ? 'Speak ONLY in English.'
        : 'Respond in the language the user used, or mix Arabic/English naturally (Gym slang).'

    const finalCompletion = await openai.chat.completions.create({
      model: effectiveIsPro ? 'gpt-5.2' : 'gpt-5-mini',
      messages: [
        {
          role: 'system', content: `You are Hazem, an Omani gym comrade. 
Confirm successful logs naturally.
- Be supportive. If Arabic: "تم يالشيخ", "سجلت لك الحين", "كفو عليك". If English: "Done chief", "Logged it", "Keep it up".
- IF PRO: Compare current logs to history if provided. Notice the progress!
- If a log failed: explain why briefly.
- Maintain your "calm gym bro" soul.
- ${systemPromptLang}`
        },
        { role: 'user', content: `User query: "${query}". Batch Results: ${JSON.stringify(results)}. Respond naturally to the user.` },
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
        data: results,
        debug: {
          tool_calls: message.tool_calls
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