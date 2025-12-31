import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Requested-With',
};

const ML_BACKEND_URL = Deno.env.get('ML_BACKEND_URL') || 'https://clyvaraml.replit.app';
const ML_API_KEY = Deno.env.get('ML_API_KEY') || '0Rvm9uG9jFO37Yi1OLcEzf7eIZuMQWnY';

const ALLOWED_PATTERNS = [
  /^https:\/\/.*\.webcontainer-api\.io$/,
  /^https:\/\/.*\.local-credentialless\.webcontainer-api\.io$/,
  /^https:\/\/.*\.replit\.dev$/,
  /^https:\/\/.*\.repl\.co$/,
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.bolt\.new$/,
  /^https:\/\/.*\.expo\.dev$/,
  /^https:\/\/.*\.supabase\.co$/,
];

const isOriginAllowed = (req: Request): boolean => {
  const referrer = req.headers.get('referer') || req.headers.get('referrer');
  const origin = req.headers.get('origin');

  const isAllowedOrigin = origin && ALLOWED_PATTERNS.some(pattern => pattern.test(origin));
  const isWebContainer = !referrer && !origin;

  return isAllowedOrigin || isWebContainer;
};

const getMLBackendHeaders = (includeContentType = false) => {
  const headers: Record<string, string> = {
    'X-API-Key': ML_API_KEY,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://rddpacqtmtsehbmcyxfa.supabase.co',
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('[ml-backend-proxy] Headers:', {
    hasApiKey: !!ML_API_KEY,
    apiKeyLength: ML_API_KEY?.length,
    headers: Object.keys(headers)
  });

  return headers;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let action: string | null = null;

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
    action = url.searchParams.get('action');

    if (!action) {
      throw new Error('Missing action parameter');
    }

    let mlResponse: Response;

    switch (action) {
      case 'sync_user': {
        const body = await req.json();
        mlResponse = await fetch(`${ML_BACKEND_URL}/api/users/sync`, {
          method: 'POST',
          headers: getMLBackendHeaders(true),
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
          `${ML_BACKEND_URL}/api/get-next-questions/${mlUserId}?${params}`,
          {
            method: 'GET',
            headers: getMLBackendHeaders(),
          }
        );
        break;
      }

      case 'submit_answer': {
        const body = await req.json();
        console.log('[ml-backend-proxy] Submitting answer:', {
          ml_backend_url: ML_BACKEND_URL,
          payload: body,
        });
        try {
          mlResponse = await fetch(`${ML_BACKEND_URL}/api/submit-answer`, {
            method: 'POST',
            headers: getMLBackendHeaders(true),
            body: JSON.stringify(body),
          });
        } catch (fetchError) {
          console.error('[ml-backend-proxy] Network error when submitting answer:', fetchError);
          throw new Error('Failed to connect to ML Backend. The service may be offline or unreachable.');
        }
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(true),
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(),
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
            headers: getMLBackendHeaders(true),
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
            headers: getMLBackendHeaders(true),
            body: JSON.stringify(body),
          }
        );
        break;
      }

      case 'generate_questions': {
        const body = await req.json();
        const { topic_id, count = 10 } = body;

        if (!topic_id) {
          throw new Error('Missing topic_id');
        }

        mlResponse = await fetch(
          `${ML_BACKEND_URL}/api/questions/generate`,
          {
            method: 'POST',
            headers: getMLBackendHeaders(true),
            body: JSON.stringify({ topic_id, count }),
          }
        );
        break;
      }

      case 'diagnostic_questions': {
        const mlUserId = url.searchParams.get('user_id');
        if (!mlUserId) {
          throw new Error('Missing user_id');
        }

        const diagnosticQuestionsUrl = `${ML_BACKEND_URL}/api/diagnostic-exam/${mlUserId}`;
        console.log('[ml-backend-proxy] Fetching diagnostic questions:', diagnosticQuestionsUrl);

        mlResponse = await fetch(diagnosticQuestionsUrl, {
          method: 'GET',
          headers: getMLBackendHeaders(),
        });

        console.log('[ml-backend-proxy] Diagnostic questions response:', mlResponse.status);
        break;
      }

      case 'diagnostic_status': {
        const mlUserId = url.searchParams.get('user_id');
        if (!mlUserId) {
          throw new Error('Missing user_id');
        }

        const diagnosticStatusUrl = `${ML_BACKEND_URL}/api/diagnostic-exam/status/${mlUserId}`;
        console.log('[ml-backend-proxy] Fetching diagnostic status:', diagnosticStatusUrl);

        mlResponse = await fetch(diagnosticStatusUrl, {
          method: 'GET',
          headers: getMLBackendHeaders(),
        });

        console.log('[ml-backend-proxy] Diagnostic status response:', mlResponse.status);
        break;
      }

      case 'submit_diagnostic_answer': {
        const body = await req.json();
        const submitUrl = `${ML_BACKEND_URL}/api/diagnostic-exam/submit-answer`;
        console.log('[ml-backend-proxy] Submitting diagnostic answer:', { url: submitUrl, body });

        mlResponse = await fetch(submitUrl, {
          method: 'POST',
          headers: getMLBackendHeaders(true),
          body: JSON.stringify(body),
        });

        console.log('[ml-backend-proxy] Submit answer response:', mlResponse.status);
        break;
      }

      case 'complete_diagnostic': {
        const body = await req.json();
        const { user_id } = body;
        if (!user_id) {
          throw new Error('Missing user_id');
        }

        const completeUrl = `${ML_BACKEND_URL}/api/diagnostic-exam/complete/${user_id}`;
        console.log('[ml-backend-proxy] Completing diagnostic exam:', { url: completeUrl, user_id });

        mlResponse = await fetch(completeUrl, {
          method: 'POST',
          headers: getMLBackendHeaders(true),
          body: JSON.stringify(body),
        });

        console.log('[ml-backend-proxy] Complete diagnostic response:', mlResponse.status);
        break;
      }

      case 'diagnostic_results': {
        const mlUserId = url.searchParams.get('user_id');
        if (!mlUserId) {
          throw new Error('Missing user_id');
        }

        const resultsUrl = `${ML_BACKEND_URL}/api/diagnostic-exam/results/${mlUserId}`;
        console.log('[ml-backend-proxy] Fetching diagnostic results:', resultsUrl);

        mlResponse = await fetch(resultsUrl, {
          method: 'GET',
          headers: getMLBackendHeaders(),
        });

        console.log('[ml-backend-proxy] Diagnostic results response:', mlResponse.status);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error('ML Backend API Error:', {
        status: mlResponse.status,
        action,
        url: mlResponse.url,
        error: errorText,
      });

      let errorMessage = `ML Backend returned ${mlResponse.status}`;

      if (mlResponse.status === 503 || mlResponse.status === 502) {
        errorMessage = 'ML Backend is currently unavailable. It may be starting up or experiencing downtime.';
      } else if (mlResponse.status === 404) {
        if (action === 'diagnostic_questions' || action === 'diagnostic_status' ||
            action === 'submit_diagnostic_answer' || action === 'complete_diagnostic' ||
            action === 'diagnostic_results') {
          return new Response(
            JSON.stringify({
              error: 'Diagnostic endpoints not yet implemented',
              fallback: true,
            }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        errorMessage = `ML Backend endpoint not found: ${action}`;
      } else if (mlResponse.status === 400) {
        errorMessage = `Invalid request to ML Backend: ${errorText}`;
      } else {
        errorMessage = `ML Backend error: ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await mlResponse.json();
    console.log('ML Backend Success:', {
      action,
      url: mlResponse.url,
      hasData: !!data,
    });

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('ML Backend Proxy error:', {
      message: error.message,
      action,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        action,
        details: 'Check edge function logs for more information'
      }),
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