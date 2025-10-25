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
    // Test environment variables
    const PLATFORM_PRIVATE_KEY = Deno.env.get('PLATFORM_PRIVATE_KEY');
    const SIGNER_PRIVATE_KEY = Deno.env.get('SIGNER_PRIVATE_KEY');
    const NEXUS_RPC_URL = Deno.env.get('NEXUS_RPC_URL');

    return new Response(
      JSON.stringify({
        PLATFORM_PRIVATE_KEY: PLATFORM_PRIVATE_KEY ? 'SET' : 'NOT SET',
        SIGNER_PRIVATE_KEY: SIGNER_PRIVATE_KEY ? 'SET' : 'NOT SET',
        NEXUS_RPC_URL: NEXUS_RPC_URL || 'NOT SET',
        PLATFORM_PRIVATE_KEY_LENGTH: PLATFORM_PRIVATE_KEY?.length || 0,
        SIGNER_PRIVATE_KEY_LENGTH: SIGNER_PRIVATE_KEY?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
