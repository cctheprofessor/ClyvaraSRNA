import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question_ids } = body;

    if (!question_ids || !Array.isArray(question_ids)) {
      return new Response(
        JSON.stringify({ error: 'question_ids array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', question_ids);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return Response.json({ questions });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch questions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
