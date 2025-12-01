import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== Function started ===');

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }
    console.log('OpenAI key found');

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));

    const { caseDescription } = body;

    if (!caseDescription || typeof caseDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: caseDescription is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Case description received, length:', caseDescription.length);

    const testPrompt = `Generate a JSON object with patient data for: ${caseDescription.substring(0, 200)}. Return ONLY valid JSON starting with { and ending with }.`;

    console.log('Making OpenAI API call...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error (${openAIResponse.status}): ${error}`);
    }

    const data = await openAIResponse.json();
    console.log('OpenAI response received');
    console.log('Response keys:', Object.keys(data));

    const content = data.choices?.[0]?.message?.content;
    console.log('Content extracted:', !!content);
    console.log('Content preview:', content?.substring(0, 100));

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const carePlan = JSON.parse(content);
    console.log('JSON parsed successfully');

    return new Response(JSON.stringify(carePlan), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('=== Error in function ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate care plan',
        type: error.constructor.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});