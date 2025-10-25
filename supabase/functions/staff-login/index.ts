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

    const { email, password, eventId } = await req.json();

    if (!email || !password || !eventId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing credentials' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: staff, error } = await supabaseClient
      .from('event_staff')
      .select('*')
      .eq('email', email)
      .eq('event_id', eventId)
      .single();

    if (error || !staff) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Simple password verification using btoa (base64 encoding)
    const expectedHash = btoa(password);
    const isValid = expectedHash === staff.password_hash;

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        staff: { 
          id: staff.id, 
          email: staff.email, 
          eventId: staff.event_id 
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
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});