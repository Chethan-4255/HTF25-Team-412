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

    // Get user's wallet address from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    let walletAddress = profile.wallet_address;

    // Generate wallet address if user doesn't have one
    if (!walletAddress) {
      const chars = '0123456789abcdef';
      walletAddress = '0x';
      for (let i = 0; i < 40; i++) {
        walletAddress += chars[Math.floor(Math.random() * chars.length)];
      }
      
      // Update user's profile with the generated wallet
      await supabaseClient
        .from('profiles')
        .update({ wallet_address: walletAddress })
        .eq('id', userId);
    }

    // Real NFT minting on Nexus testnet
    const CONTRACT_ADDRESS = '0x80948605d70Ffe40786AafC68c24bfd1a786B59D';
    const CONTRACT_ABI = [
      {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "uri",
            "type": "string"
          }
        ],
        "name": "safeMint",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
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
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Get platform wallet private key from environment
    const PLATFORM_PRIVATE_KEY = Deno.env.get('PLATFORM_PRIVATE_KEY');
    console.log('PLATFORM_PRIVATE_KEY:', PLATFORM_PRIVATE_KEY ? 'SET' : 'NOT SET');
    if (!PLATFORM_PRIVATE_KEY) {
      console.log('Falling back to demo mode - no platform private key');
      // Fallback to demo mode
      const { data: ticket, error } = await supabaseClient
        .from('tickets')
        .insert([{
          event_id: eventId,
          owner_user_id: userId,
          token_id: Math.floor(Math.random() * 1000000),
          owner_address: walletAddress,
          transaction_hash: null,
          is_verified: false,
          is_blockchain_verified: false
        }])
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, ticket, demo: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Connect to Nexus testnet
    const NEXUS_RPC_URL = Deno.env.get('NEXUS_RPC_URL') || 'https://rpc.nexus.xyz';
    const provider = new ethers.JsonRpcProvider(NEXUS_RPC_URL);
    const wallet = new ethers.Wallet(PLATFORM_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Create metadata URI for the ticket
    const metadataUri = `https://api.eventpravesh.com/nft/${eventId}/${userId}`;
    
    console.log(`Minting NFT to ${walletAddress} with URI: ${metadataUri}`);
    
    // Mint the NFT
    const tx = await contract.safeMint(walletAddress, metadataUri);
    console.log(`Transaction sent: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed: ${receipt.hash}`);
    
    // Extract token ID from the Transfer event
    let tokenId: string | null = null;
    
    console.log(`Transaction receipt logs count: ${receipt.logs.length}`);
    
    // Method 1: Look for Transfer event in logs
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'Transfer') {
          tokenId = parsed.args.tokenId.toString();
          console.log(`Found token ID from Transfer event: ${tokenId}`);
          break;
        }
      } catch (e) {
        console.log(`Failed to parse log: ${e.message}`);
      }
    }
    
    // Method 2: If no Transfer event found, try to decode logs manually
    if (!tokenId) {
      console.log('No Transfer event found, trying manual log parsing...');
      for (const log of receipt.logs) {
        try {
          // Transfer event signature: Transfer(address,address,uint256)
          const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          if (log.topics[0] === transferTopic && log.topics.length >= 4) {
            // Extract tokenId from the third topic (index 3)
            tokenId = parseInt(log.topics[3], 16).toString();
            console.log(`Found token ID from manual parsing: ${tokenId}`);
            break;
          }
        } catch (e) {
          console.log(`Failed manual parsing: ${e.message}`);
        }
      }
    }
    
    // Method 3: Query the contract for the exact token ID that was minted
    if (!tokenId) {
      console.log('No token ID found in logs, querying contract for the minted token...');
      try {
        // Get the current total supply - this represents the next token ID to be minted
        const totalSupply = await contract.totalSupply();
        console.log(`Current total supply: ${totalSupply}`);
        
        // The token ID that was just minted should be totalSupply - 1 (since totalSupply is the next ID)
        if (totalSupply > 0) {
          tokenId = (totalSupply - 1).toString();
          console.log(`Using token ID from totalSupply: ${tokenId}`);
          
          // Verify this token exists and is owned by our wallet
          const actualOwner = await contract.ownerOf(tokenId);
          console.log(`Verifying token ${tokenId} is owned by ${actualOwner}`);
          
          if (actualOwner.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error(`Token ${tokenId} ownership mismatch: expected ${walletAddress}, got ${actualOwner}`);
          }
          
          console.log(`Token ${tokenId} ownership verified successfully`);
        } else {
          throw new Error('No tokens minted yet');
        }
      } catch (e) {
        console.error('Error querying contract for token ID:', e);
        throw new Error(`Failed to determine token ID from blockchain: ${e.message}`);
      }
    }
    
    // Final verification - ensure we have a valid token ID
    if (!tokenId) {
      throw new Error('Failed to extract token ID from transaction');
    }
    
    console.log(`Final token ID: ${tokenId}`);
    
    console.log(`NFT minted successfully: Token ID ${tokenId}`);

    console.log('Inserting ticket into database...');
    console.log('Token ID:', tokenId, 'Type:', typeof tokenId);
    console.log('Transaction hash:', receipt.hash);
    console.log('Event ID:', eventId, 'Type:', typeof eventId);
    console.log('User ID:', userId, 'Type:', typeof userId);
    console.log('Wallet Address:', walletAddress, 'Type:', typeof walletAddress);
    
    const ticketData = {
      event_id: eventId,
      owner_user_id: userId,
      token_id: parseInt(tokenId!),
      owner_address: walletAddress,
      transaction_hash: receipt.hash,
      is_verified: false,
      is_blockchain_verified: true
    };
    
    console.log('Ticket data to insert:', ticketData);
    
    const { data: ticket, error } = await supabaseClient
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Database insertion failed: ${error.message}`);
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
    console.error('Buy ticket error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
