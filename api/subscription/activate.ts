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

// Cashfree verification (mock - in production, use Cashfree SDK or API)
async function verifyCashfreePayment(_orderId: string, _transactionId: string): Promise<{ verified: boolean; status: string }> {
  // Mock verification - replace with actual Cashfree API call
  // const cashfree = new Cashfree({ mode: 'production' });
  // const response = await cashfree.PGOrderFetchPayment(orderId);
  // return { verified: response.data[0]?.payment_status === 'SUCCESS', status: response.data[0]?.payment_status };

  return { verified: true, status: 'SUCCESS' };
}

// PayPal verification (integrated mock - in production, verify with PayPal API)
async function verifyPayPalPayment(_orderId: string, _payerId: string): Promise<{ verified: boolean; orderId: string; status: string }> {
  // Mock verification - replace with actual PayPal API call
  // const response = await paypal.captureOrder(orderId);
  // return { verified: response.status === 'COMPLETED', orderId, status: response.status };

  return {
    verified: true,
    orderId: `PAYPL_ORDER_${Date.now()}`,
    status: 'COMPLETED'
  };
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
    const { gateway, transactionId, orderId, signature } = await request.json();

    let verified = false;

    // Verify payment based on gateway
    switch (gateway) {
      case 'razorpay': {
        const razorpaySecret = import.meta.env.RAZORPAY_SECRET_KEY || '';
        if (!razorpaySecret) {
          return new Response(JSON.stringify({ error: 'Razorpay not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        verified = verifyRazorpaySignature(orderId, transactionId, signature, razorpaySecret);
        break;
      }

      case 'cashfree': {
        const result = await verifyCashfreePayment(orderId, transactionId);
        verified = result.verified;
        break;
      }

      case 'paypal': {
        const result = await verifyPayPalPayment(orderId, transactionId); // Note: using transactionId as payerId for mock
        verified = result.verified;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unsupported gateway' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update user's subscription status
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {}
      }
    });

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ subscription_status: 'pro' })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to activate subscription' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription activated successfully',
      gateway,
      transactionId,
      orderId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscription activation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};