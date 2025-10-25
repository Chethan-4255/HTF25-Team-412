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

    const { ticketId } = await req.json();

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: ticket, error } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) throw error;

    // Create the payload with tokenId and owner (no timestamp for permanent QR codes)
    const payload = {
      tokenId: ticket.token_id,
      owner: ticket.owner_address
    };

    // Get the secret signer private key from environment
    const SIGNER_PRIVATE_KEY = Deno.env.get('SIGNER_PRIVATE_KEY');
    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('SIGNER_PRIVATE_KEY not configured');
    }

    // Create a proper cryptographic signature using the private key
    const message = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Import the private key for signing
    const privateKeyBuffer = new TextEncoder().encode(SIGNER_PRIVATE_KEY);
    const key = await crypto.subtle.importKey(
      'raw',
      privateKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the payload
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const qrData = JSON.stringify({ payload, signature });

    return new Response(
      JSON.stringify({ qrData }),
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