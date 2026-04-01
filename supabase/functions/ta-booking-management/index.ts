import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { action, booking_id, cancellation_reason } = await req.json();

    if (!action || !booking_id) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .select('*, ta_profiles!inner(user_id)')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isStudent = booking.student_id === user.id;
    const isTA = booking.ta_profiles.user_id === user.id;

    if (!isStudent && !isTA) {
      return new Response(JSON.stringify({ error: 'Unauthorized to modify this booking' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'cancel':
        return await handleCancellation(booking, user.id, cancellation_reason);

      case 'complete':
        return await handleCompletion(booking, isTA);

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Booking management error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCancellation(
  booking: any,
  userId: string,
  cancellationReason: string,
) {
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return new Response(
      JSON.stringify({ error: 'Booking cannot be cancelled in current status' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { error: updateError } = await supabase
    .from('ta_bookings')
    .update({
      status: 'cancelled',
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('Failed to update booking:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to cancel booking' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Booking cancelled successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleCompletion(booking: any, isTA: boolean) {
  if (!isTA) {
    return new Response(
      JSON.stringify({ error: 'Only TAs can mark sessions as completed' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (booking.status !== 'approved') {
    return new Response(
      JSON.stringify({ error: 'Only approved bookings can be marked as completed' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { error: updateError } = await supabase
    .from('ta_bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('Failed to complete booking:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to mark booking as completed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Session marked as completed successfully' }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
