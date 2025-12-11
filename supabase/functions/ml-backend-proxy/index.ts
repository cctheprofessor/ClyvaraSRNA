import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Requested-With',
};

const ML_BACKEND_URL = Deno.env.get('ML_BACKEND_URL') || 'https://clyvaraml.replit.app';
const ML_API_KEY = Deno.env.get('ML_API_KEYS') || '0Rvm9uG9jFO37Yi1OLcEzf7eIZuMQWnY';

const ALLOWED_REFERRERS = [
  'localhost',
  '127.0.0.1',
  'replit.dev',
  'webcontainer-api.io',
  'webcontainer.io',
  'stackblitz.io',
  'local-credentialless',
  'supabase.co',
  'bolt.new',
  'expo.dev',
  'expo.io',
];

const DISABLE_REFERRER_CHECK = Deno.env.get('DISABLE_REFERRER_CHECK') === 'true';

const isReferrerAllowed = (req: Request): boolean => {
  if (DISABLE_REFERRER_CHECK) {
    return true;
  }

  const referer = req.headers.get('Referer') || req.headers.get('referer');
  const origin = req.headers.get('Origin') || req.headers.get('origin');

  const sourceUrl = referer || origin;

  if (!sourceUrl) {
    console.log('No referer or origin header found');
    return false;
  }

  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname;

    const isAllowed = ALLOWED_REFERRERS.some(allowedDomain =>
      hostname === allowedDomain ||
      hostname.endsWith(`.${allowedDomain}`) ||
      hostname.includes(allowedDomain)
    );

    if (!isAllowed) {
      console.log(`Referrer not allowed: ${hostname}`);
    }

    return isAllowed;
  } catch (error) {
    console.error('Error parsing referrer URL:', error);
    return false;
  }
};

const getMLBackendHeaders = (req: Request, includeContentType = false) => {
  const headers: Record<string, string> = {
    'X-API-Key': ML_API_KEY,
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!isReferrerAllowed(req)) {
      const referer = req.headers.get('Referer') || req.headers.get('referer');
      const origin = req.headers.get('Origin') || req.headers.get('origin');
      const sourceUrl = referer || origin || 'unknown';

      return new Response(
        JSON.stringify({
          error: 'Invalid referrer',
          message: 'Requests must come from an allowed domain',
          referrer: sourceUrl,
          hint: 'If you are testing locally, set DISABLE_REFERRER_CHECK=true in environment variables',
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

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
          headers: getMLBackendHeaders(req, true),
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
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'submit_answer': {
        const body = await req.json();
        mlResponse = await fetch(`${ML_BACKEND_URL}/api/practice/submit-answer`, {
          method: 'POST',
          headers: getMLBackendHeaders(req, true),
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
            headers: getMLBackendHeaders(req),
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
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'download_questions': {
        const mlUserId = url.searchParams.get('ml_user_id');
        const count = url.searchParams.get('count') || '100';

        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        const params = new URLSearchParams({
          user_id: mlUserId,
          count: count,
        });

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/questions/download-batch?${params}`,
          {
            method: 'GET',
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'sync_offline_responses': {
        const body = await req.json();
        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/responses/sync-batch`,
          {
            method: 'POST',
            headers: getMLBackendHeaders(req, true),
            body: JSON.stringify(body),
          }
        );
        break;
      }

      case 'get_question_type_performance': {
        const mlUserId = url.searchParams.get('ml_user_id');
        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/student-insights/${mlUserId}/question-types`,
          {
            method: 'GET',
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'get_concept_coverage': {
        const mlUserId = url.searchParams.get('ml_user_id');
        const topicId = url.searchParams.get('topic_id');

        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        const params = topicId ? `?topic_id=${topicId}` : '';
        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/students/${mlUserId}/concept-coverage${params}`,
          {
            method: 'GET',
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'predict_topic_performance': {
        const mlUserId = url.searchParams.get('ml_user_id');
        const topicId = url.searchParams.get('topic_id');

        if (!mlUserId || !topicId) {
          throw new Error('Missing ml_user_id or topic_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/students/${mlUserId}/predict-topic/${topicId}`,
          {
            method: 'GET',
            headers: getMLBackendHeaders(req),
          }
        );
        break;
      }

      case 'get_study_path': {
        const mlUserId = url.searchParams.get('ml_user_id');
        const pathLength = url.searchParams.get('path_length') || '20';

        if (!mlUserId) {
          throw new Error('Missing ml_user_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/students/${mlUserId}/generate-study-path`,
          {
            method: 'POST',
            headers: getMLBackendHeaders(req, true),
            body: JSON.stringify({ path_length: parseInt(pathLength) }),
          }
        );
        break;
      }

      case 'batch_sync_users': {
        const body = await req.json();
        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/users/batch-sync`,
          {
            method: 'POST',
            headers: getMLBackendHeaders(req, true),
            body: JSON.stringify(body),
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