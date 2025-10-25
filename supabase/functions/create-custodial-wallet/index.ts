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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate a new wallet for the user
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt the private key (in production, use proper encryption)
    const encryptedPrivateKey = Buffer.from(privateKey).toString('base64');

    // Update user's profile with wallet address and encrypted private key
    const { error } = await supabaseClient
      .from('profiles')
      .update({ 
        wallet_address: walletAddress,
        encrypted_private_key: encryptedPrivateKey
      })
      .eq('id', userId);

    if (error) throw error;

    console.log(`Generated wallet for user ${userId}: ${walletAddress}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        walletAddress,
        message: 'Custodial wallet created successfully'
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
