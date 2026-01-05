import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TwilioMessage {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse Twilio webhook data
    const formData = await req.formData()
    const messageData: TwilioMessage = {
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string || '',
      NumMedia: formData.get('NumMedia') as string || '0',
    }

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = messageData.From.replace('whatsapp:', '')
    const message = messageData.Body.trim()

    if (!message) {
      return new Response('', { status: 200 })
    }

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, phone_number')
      .eq('phone_number', phoneNumber)
      .single()

    if (profileError || !profile) {
      // User not found - send instructions
      const response = `Welcome! To use the Gym Tracker WhatsApp bot, you need to link your phone number to your account.

Please visit the web app and add your phone number in your profile settings, or reply with your account email to verify.`
      
      await sendTwilioMessage(
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber,
        messageData.From,
        response
      )

      return new Response('', { status: 200 })
    }

    // Get user's session token (in production, you'd want a better way to handle this)
    // For now, we'll use the service role to call the LLM function directly
    const userId = profile.user_id

    // Call the LLM query function
    const llmFunctionUrl = `${supabaseUrl}/functions/v1/llm-query`
    
    // Get a user's access token (this is a simplified approach)
    // In production, you might want to store a long-lived token or use a different auth method
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    
    if (!user) {
      await sendTwilioMessage(
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber,
        messageData.From,
        'Sorry, there was an error authenticating your account. Please try again later.'
      )
      return new Response('', { status: 200 })
    }

    // Create a session token for the user (simplified - in production use proper token management)
    const { data: { session }, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email || '',
    })

    // For now, we'll call the LLM function with service role
    // In production, you'd want to properly authenticate the user
    try {
      const llmResponse = await fetch(llmFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          query: message,
          user_id: userId, // Pass user_id directly for service role calls
        }),
      })

      if (!llmResponse.ok) {
        throw new Error('LLM function failed')
      }

      const llmData = await llmResponse.json()
      const responseText = llmData.response || 'I received your message but have no response.'

      // Send response via Twilio
      await sendTwilioMessage(
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber,
        messageData.From,
        responseText
      )
    } catch (error: any) {
      console.error('Error calling LLM function:', error)
      await sendTwilioMessage(
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber,
        messageData.From,
        'Sorry, I encountered an error processing your request. Please try again later.'
      )
    }

    return new Response('', { status: 200 })
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  
  const formData = new URLSearchParams()
  formData.append('From', from)
  formData.append('To', to)
  formData.append('Body', body)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Twilio API error: ${errorText}`)
  }

  return response.json()
}


