import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
})

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    try {
        const body = await req.text()
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
        )

        const subscription = event.data.object as any

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const status = subscription.status
                const endsAt = new Date(subscription.current_period_end * 1000).toISOString()

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        is_pro: status === 'active',
                        subscription_ends_at: endsAt
                    })
                    .eq('stripe_customer_id', subscription.customer)
                break
            }
            case 'customer.subscription.deleted': {
                await supabaseAdmin
                    .from('profiles')
                    .update({
                        is_pro: false,
                        subscription_ends_at: null
                    })
                    .eq('stripe_customer_id', subscription.customer)
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
