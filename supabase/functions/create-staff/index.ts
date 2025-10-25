import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { eventId, email, password } = body;

    console.log('Received request:', { eventId, email, password: '***' });

    if (!eventId || !email || !password) {
      console.log('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventId, email, password' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Simple password hashing
    const passwordHash = btoa(password);
    console.log('Password hashed successfully');

    const { data: staff, error } = await supabaseClient
      .from('event_staff')
      .insert([{
        event_id: eventId,
        email: email,
        password_hash: passwordHash
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Staff created successfully:', staff);
    return new Response(
      JSON.stringify({ 
        success: true, 
        staff: { 
          id: staff.id, 
          email: staff.email 
        } 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: `Function error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});