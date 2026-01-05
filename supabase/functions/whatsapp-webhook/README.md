# WhatsApp Webhook Edge Function

This Edge Function handles incoming WhatsApp messages via Twilio and routes them to the LLM query function.

## Setup

1. Set up Twilio WhatsApp:
   - Create a Twilio account
   - Get a WhatsApp sandbox number or apply for production
   - Configure webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`

2. Set environment variables:
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_WHATSAPP_NUMBER`: Your Twilio WhatsApp number (format: whatsapp:+1234567890)

3. User phone number mapping:
   - Users need to add their phone number to their profile in the web app
   - The phone number should be in E.164 format (e.g., +1234567890)

## Usage

Users send WhatsApp messages to your Twilio number, and the bot responds with fitness data or logs entries based on natural language queries.

## Examples

- "What did I bench press last week?"
- "Log 3 sets of squats at 225lbs"
- "Show me my calories for today"


