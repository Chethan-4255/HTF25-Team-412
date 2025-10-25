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

    const { eventId, userId } = await req.json();

    if (!eventId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing eventId or userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test database insertion with sample data
    const testData = {
      event_id: eventId,
      owner_user_id: userId,
      token_id: 12345,
      owner_address: '0x1234567890abcdef1234567890abcdef12345678',
      transaction_hash: '0xtest123456789',
      is_verified: false,
      is_blockchain_verified: true
    };

    console.log('Testing database insertion with:', testData);

    const { data: ticket, error } = await supabaseClient
      .from('tickets')
      .insert([testData])
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Ticket inserted successfully:', ticket.id);

    return new Response(
      JSON.stringify({ success: true, ticket }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
