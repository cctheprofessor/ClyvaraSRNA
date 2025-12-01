import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ML_BACKEND_URL = Deno.env.get('ML_BACKEND_URL') || 'https://clyvaraml.replit.app';
const ML_API_KEY = Deno.env.get('ML_API_KEYS') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (!action) {
      throw new Error('Missing action parameter');
    }

    let mlResponse: Response;

    switch (action) {
      case 'sync_user': {
        const body = await req.json();
        mlResponse = await fetch(`${ML_BACKEND_URL}/api/users/sync`, {
          method: 'POST',
          headers: {
            'X-API-Key': ML_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        break;
      }

      case 'get_questions': {
        const mlUserId = url.searchParams.get('ml_user_id');
        const limit = url.searchParams.get('limit') || '25';
        const topicId = url.searchParams.get('topic_id');
        
        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        const params = new URLSearchParams({ limit });
        if (topicId) params.append('topic_id', topicId);

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/practice/${mlUserId}/next-questions?${params}`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': ML_API_KEY,
            },
          }
        );
        break;
      }

      case 'submit_answer': {
        const body = await req.json();
        mlResponse = await fetch(`${ML_BACKEND_URL}/api/practice/submit-answer`, {
          method: 'POST',
          headers: {
            'X-API-Key': ML_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        break;
      }

      case 'get_insights': {
        const mlUserId = url.searchParams.get('ml_user_id');
        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/student-insights/${mlUserId}`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': ML_API_KEY,
            },
          }
        );
        break;
      }

      case 'get_progression': {
        const mlUserId = url.searchParams.get('ml_user_id');
        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/students/${mlUserId}/progression`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': ML_API_KEY,
            },
          }
        );
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      throw new Error(`ML Backend error (${mlResponse.status}): ${errorText}`);
    }

    const data = await mlResponse.json();

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('ML Backend Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
