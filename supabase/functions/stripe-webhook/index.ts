import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Clyvara Donations',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Requested-With, stripe-signature',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Webhook event received:', event.type);

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const userId = session.metadata?.user_id;
  const bookingId = session.metadata?.booking_id;
  const donationId = session.metadata?.donation_id;
  const donationType = session.metadata?.donation_type;

  // Handle TA booking payments
  if (bookingId) {
    console.log('Processing TA booking payment:', bookingId);

    const { data: booking, error: fetchError } = await supabase
      .from('ta_bookings')
      .select('ta_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      console.error('Failed to fetch booking:', fetchError);
      return;
    }

    const { data: taProfile, error: profileError } = await supabase
      .from('ta_profiles')
      .select('meeting_link')
      .eq('id', booking.ta_id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch TA profile:', profileError);
    }

    const { error } = await supabase
      .from('ta_bookings')
      .update({
        status: 'confirmed',
        stripe_payment_intent_id: session.payment_intent as string,
        meeting_link: taProfile?.meeting_link || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Failed to update booking:', error);
    } else {
      console.log('Successfully confirmed booking:', bookingId);
    }
    return;
  }

  // Handle donation payments
  if (!userId || !donationId) {
    console.error('Missing metadata in session:', session.id);
    return;
  }

  if (donationType === 'one_time') {
    // Update donation status for one-time payment
    const { error } = await supabase
      .from('donations')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        metadata: {
          session_id: session.id,
          amount_total: session.amount_total,
          customer_email: session.customer_email,
        },
      })
      .eq('id', donationId);

    if (error) {
      console.error('Failed to update donation:', error);
    } else {
      console.log('Successfully updated one-time donation:', donationId);
    }
  } else if (donationType === 'monthly') {
    // For subscriptions, mark initial donation as completed
    const { error } = await supabase
      .from('donations')
      .update({
        status: 'completed',
        metadata: {
          session_id: session.id,
          subscription_id: session.subscription,
        },
      })
      .eq('id', donationId);

    if (error) {
      console.error('Failed to update subscription donation:', error);
    } else {
      console.log('Successfully updated subscription donation:', donationId);
    }
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);

  // Skip if this is part of a subscription invoice (handled separately)
  if (paymentIntent.invoice) {
    console.log('Skipping invoice payment intent');
    return;
  }

  const { error } = await supabase
    .from('donations')
    .update({
      status: 'completed',
      metadata: {
        payment_method: paymentIntent.payment_method,
        receipt_email: paymentIntent.receipt_email,
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update donation on payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

  const { error } = await supabase
    .from('donations')
    .update({
      status: 'failed',
      metadata: {
        failure_code: paymentIntent.last_payment_error?.code,
        failure_message: paymentIntent.last_payment_error?.message,
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update donation on payment failure:', error);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  const customerId = subscription.customer as string;

  // Get user from stripe_customers table
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!customer) {
    console.error('Customer not found for subscription:', subscription.id);
    return;
  }

  // Update stripe_subscriptions table
  const { error } = await supabase
    .from('stripe_subscriptions')
    .upsert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: subscription.items.data[0]?.price.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
    }, {
      onConflict: 'customer_id',
    });

  if (error) {
    console.error('Failed to update subscription:', error);
  } else {
    console.log('Successfully updated subscription:', subscription.id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);

  const { error } = await supabase
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      deleted_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscription.id);

  if (error) {
    console.error('Failed to mark subscription as deleted:', error);
  } else {
    console.log('Successfully marked subscription as deleted:', subscription.id);
  }
}
