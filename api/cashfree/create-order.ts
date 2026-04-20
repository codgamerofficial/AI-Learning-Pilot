import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { amount, customerName, customerEmail, customerPhone } = await request.json();

    const appId = import.meta.env.VITE_CASHFREE_APP_ID;
    const secretKey = import.meta.env.CASHFREE_SECRET_KEY;
    const isProd = import.meta.env.PROD;

    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Cashfree not configured on server' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = isProd 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';

    const orderId = `order_${Date.now()}`;

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: 'INR',
        order_id: orderId,
        customer_details: {
          customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, '_'), // sanitized ID
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || '9999999999' // default if missing
        },
        order_meta: {
          return_url: `${new URL(request.url).origin}/billing?order_id={order_id}`
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree API error:', data);
      return new Response(JSON.stringify({ error: data.message || 'Failed to create Cashfree order' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cashfree order creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
