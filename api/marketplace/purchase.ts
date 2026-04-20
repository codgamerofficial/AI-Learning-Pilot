import type { APIRoute } from 'astro';
import { createServerClient } from '@supabase/ssr';
import crypto from 'crypto';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Razorpay verification
function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expectedSignature === signature;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Authenticate user
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (name: string) => {
          const cookie = request.headers.get('cookie')?.split('; ').find(row => row.startsWith(`${name}=`));
          return cookie?.split('=')[1];
        },
        set: () => {},
        remove: () => {}
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { gateway, transactionId, orderId, signature, libraryItemId, amount } = await request.json();

    if (!libraryItemId) {
      return new Response(JSON.stringify({ error: 'Missing library item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let verified = false;

    // Verify payment based on gateway
    if (gateway === 'razorpay') {
      const razorpaySecret = import.meta.env.RAZORPAY_SECRET_KEY || '';
      if (!razorpaySecret) {
        return new Response(JSON.stringify({ error: 'Razorpay not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      verified = verifyRazorpaySignature(orderId, transactionId, signature, razorpaySecret);
    } else {
      // For demo purposes, we'll allow other gateways to be "auto-verified"
      // In production, each would have its own verification logic
      verified = true;
    }

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Record the purchase using Admin Client (bypass RLS for insert if needed, though RLS should allow insert for own user)
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {}
        }
      });

    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: user.id,
        cloud_library_id: libraryItemId,
        razorpay_payment_id: transactionId,
        amount_usd: amount
      });

    if (purchaseError) {
      if (purchaseError.code === '23505') { // Unique constraint violation
         return new Response(JSON.stringify({ success: true, message: 'Already purchased' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
      }
      console.error('Failed to record purchase:', purchaseError);
      return new Response(JSON.stringify({ error: 'Failed to record purchase' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Purchase recorded successfully',
      transactionId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Marketplace purchase error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
