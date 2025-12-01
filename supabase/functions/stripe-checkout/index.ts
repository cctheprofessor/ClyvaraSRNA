import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Clyvara Donations',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { amount, donation_type, success_url, cancel_url } = await req.json();

    // Validate required parameters
    if (!amount || !donation_type || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (donation_type !== 'one_time' && donation_type !== 'monthly') {
      return new Response(JSON.stringify({ error: 'Invalid donation_type. Must be one_time or monthly' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 500) { // Minimum $5
      return new Response(JSON.stringify({ error: 'Minimum donation amount is $5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let customerId: string;

    if (existingCustomer?.customer_id) {
      customerId = existingCustomer.customer_id;
    } else {
      // Create new Stripe customer
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      });

      // Save to database
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      customerId = newCustomer.id;
    }

    // Create donation record
    const { data: donation } = await supabase
      .from('donations')
      .insert({
        user_id: user.id,
        stripe_customer_id: customerId,
        amount: amountInCents,
        currency: 'usd',
        donation_type,
        status: 'pending',
      })
      .select()
      .single();

    // Create Stripe Checkout Session
    let session: Stripe.Checkout.Session;

    if (donation_type === 'one_time') {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Clyvara Donation',
                description: 'Support Clyvara SRNA education platform',
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url,
        cancel_url,
        metadata: {
          user_id: user.id,
          donation_id: donation.id,
          donation_type: 'one_time',
        },
      });
    } else {
      // Monthly subscription
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Monthly Clyvara Support',
                description: 'Monthly donation to support Clyvara',
              },
              unit_amount: amountInCents,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url,
        cancel_url,
        metadata: {
          user_id: user.id,
          donation_id: donation.id,
          donation_type: 'monthly',
        },
      });
    }

    // Update donation with session ID
    await supabase
      .from('donations')
      .update({ stripe_session_id: session.id })
      .eq('id', donation.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
