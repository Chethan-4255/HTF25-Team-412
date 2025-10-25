import { createClient } from 'npm:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.4';

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

    const { qrDataString, staffEventId } = await req.json();

    if (!qrDataString || !staffEventId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { payload, signature } = JSON.parse(qrDataString);

    // Get the secret signer private key from environment
    const SIGNER_PRIVATE_KEY = Deno.env.get('SIGNER_PRIVATE_KEY');
    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('SIGNER_PRIVATE_KEY not configured');
    }

    // Verify the signature using the same private key
    const message = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Import the private key for verification
    const privateKeyBuffer = new TextEncoder().encode(SIGNER_PRIVATE_KEY);
    const key = await crypto.subtle.importKey(
      'raw',
      privateKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Create expected signature
    const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignatureArray = Array.from(new Uint8Array(expectedSignatureBuffer));
    const expectedSignature = expectedSignatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expectedSignature) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid signature - Ticket is forged' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: ticket, error } = await supabaseClient
      .from('tickets')
      .select('*, events!inner(id, title)')
      .eq('token_id', payload.tokenId)
      .single();

    if (error || !ticket) {
      console.log('Ticket not found in database:', { error, tokenId: payload.tokenId });
      return new Response(
        JSON.stringify({ success: false, message: 'Ticket not found in database' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Ticket found in database:', { 
      is_verified: ticket.is_verified, 
      event_id: ticket.event_id,
      token_id: ticket.token_id 
    });

    if (ticket.event_id !== staffEventId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Ticket is for a different event' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (ticket.is_verified) {
      console.log('Ticket already used:', { 
        token_id: ticket.token_id, 
        is_verified: ticket.is_verified 
      });
      return new Response(
        JSON.stringify({ success: false, message: 'Ticket already used' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Real blockchain verification
    const CONTRACT_ADDRESS = '0x80948605d70Ffe40786AafC68c24bfd1a786B59D';
    const CONTRACT_ABI = [
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "ownerOf",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    try {
      // Connect to Nexus testnet
      const NEXUS_RPC_URL = Deno.env.get('NEXUS_RPC_URL') || 'https://rpc.nexus.xyz';
      const provider = new ethers.JsonRpcProvider(NEXUS_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Verify token ownership on blockchain using the owner from the signed payload
      const onChainOwner = await contract.ownerOf(payload.tokenId);
      const expectedOwner = payload.owner.toLowerCase();
      const actualOwner = onChainOwner.toLowerCase();

      if (actualOwner !== expectedOwner) {
        return new Response(
          JSON.stringify({ success: false, message: 'Blockchain verification failed - Token ownership mismatch' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Blockchain verification passed: Token ${payload.tokenId} owned by ${actualOwner}`);
    } catch (blockchainError) {
      console.error('Blockchain verification error:', blockchainError);
      return new Response(
        JSON.stringify({ success: false, message: 'Blockchain verification failed - Unable to verify token ownership' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabaseClient
      .from('tickets')
      .update({ is_verified: true })
      .eq('id', ticket.id);

    return new Response(
      JSON.stringify({ success: true, message: `Valid ticket for ${ticket.events.title}` }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Verification error: ' + error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});