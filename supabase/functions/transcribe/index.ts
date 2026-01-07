import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

        // Get the audio file from form data
        const formData = await req.formData()
        const audioFile = formData.get('audio') as File

        if (!audioFile) {
            return new Response(
                JSON.stringify({ error: 'No audio file provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[TRANSCRIBE] Received audio: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`)

        // Initialize OpenAI
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const openai = new OpenAI({ apiKey: openaiApiKey })

        // Convert File to the format OpenAI expects
        const audioBuffer = await audioFile.arrayBuffer()
        const audioBlob = new Blob([audioBuffer], { type: audioFile.type })

        // Create a File object for the API
        const file = new File([audioBlob], audioFile.name || 'audio.webm', {
            type: audioFile.type || 'audio/webm'
        })

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'ar', // Arabic - will also understand English mixed in
            response_format: 'text',
        })

        console.log(`[TRANSCRIBE] Result: "${transcription}"`)

        return new Response(
            JSON.stringify({
                text: transcription,
                success: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[TRANSCRIBE] Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Transcription failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
