import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Clyvara TA Bookings',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SERVICE_CHARGE = 2.50; // Platform service charge in dollars

Deno.serve(async (req) => {
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

    // Authenticate user
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
    const { ta_id, session_date, start_time, duration_minutes, notes, success_url, cancel_url } = await req.json();

    // Validate required fields
    if (!ta_id || !session_date || !start_time || !duration_minutes || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate duration
    if (![30, 60, 90].includes(duration_minutes)) {
      return new Response(JSON.stringify({ error: 'Duration must be 30, 60, or 90 minutes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get TA profile and calculate session rate
    const { data: taProfile, error: taError } = await supabase
      .from('ta_profiles')
      .select('id, user_id, base_rate_30min, is_active')
      .eq('id', ta_id)
      .maybeSingle();

    if (taError || !taProfile) {
      return new Response(JSON.stringify({ error: 'TA profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!taProfile.is_active) {
      return new Response(JSON.stringify({ error: 'TA is not accepting bookings' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate session rate based on duration
    let sessionRate: number;
    const baseRate = Number(taProfile.base_rate_30min);
    
    if (duration_minutes === 30) {
      sessionRate = baseRate;
    } else if (duration_minutes === 60) {
      sessionRate = baseRate * 1.8;
    } else { // 90 minutes
      sessionRate = baseRate * 2.5;
    }

    const totalAmount = sessionRate + SERVICE_CHARGE;
    const amountInCents = Math.round(totalAmount * 100);

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
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      });

      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      customerId = newCustomer.id;
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .insert({
        ta_id: ta_id,
        student_id: user.id,
        session_date: session_date,
        start_time: start_time,
        duration_minutes: duration_minutes,
        session_rate: sessionRate,
        service_charge: SERVICE_CHARGE,
        total_amount: totalAmount,
        status: 'pending',
        notes: notes || null,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError);
      return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `TA Session - ${duration_minutes} minutes`,
              description: `Tutoring session on ${session_date} at ${start_time}`,
            },
            unit_amount: Math.round(sessionRate * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Charge',
              description: 'Platform service fee',
            },
            unit_amount: Math.round(SERVICE_CHARGE * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        user_id: user.id,
        booking_id: booking.id,
        ta_id: ta_id,
      },
    });

    // Update booking with Stripe session ID
    await supabase
      .from('ta_bookings')
      .update({ stripe_payment_intent_id: session.id })
      .eq('id', booking.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        booking_id: booking.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('TA booking checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});