/**
 * Unified Payment Gateway System
 * 
 * Supports multiple payment gateways with a common facade interface:
 * - Razorpay (Indian domestic)
 * - Cashfree (Indian domestic + international)
 * - PayPal (International)
 * - Wise (Payouts for international sellers)
 */

export type PaymentGateway = 'razorpay' | 'cashfree' | 'paypal' | 'wise'

export type PaymentResult = {
  gateway: PaymentGateway
  transactionId: string
  orderId: string
  signature?: string
  raw: unknown
}

export type PaymentCheckoutOptions = {
  orderAmount: number
  currency: string
  orderDescription: string
  userName?: string
  userEmail?: string
  onSuccess: (result: PaymentResult) => void
  onError?: (error: Error) => void
  onDismiss?: () => void
}

interface CashfreeSDK {
  checkout: (opts: {
    paymentSessionId: string
    onSuccess: (data: { transactionId: string; orderId: string }) => void
    onFailure: (error: { message: string }) => void
    onDismiss?: () => void
  }) => void
}

interface PayPalSDK {
  Buttons: (opts: {
    createOrder: () => Promise<string>
    onApprove: (data: { orderID: string }, actions: { order: { capture: () => Promise<unknown> } }) => Promise<void>
    onError: (err: { message: string }) => void
    onCancel?: () => void
  }) => { render: (selector: string) => void }
}

declare global {
  interface Window {
    Razorpay: (options: unknown) => { open: () => void }
    Cashfree: (opts: { mode: 'sandbox' | 'production' }) => CashfreeSDK
    paypal: PayPalSDK
  }
}

// ------------------------------
// Common SDK Loader Utility
// ------------------------------
function loadScript(src: string, loadedFlag: { value: boolean }): Promise<boolean> {
  if (loadedFlag.value) return Promise.resolve(true)
  
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      loadedFlag.value = true
      resolve(true)
    }
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ------------------------------
// 1. Razorpay Integration
// ------------------------------
const razorpayLoaded = { value: false }

async function loadRazorpay(): Promise<boolean> {
  return loadScript('https://checkout.razorpay.com/v1/checkout.js', razorpayLoaded)
}

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  receipt: string
}

export type RazorpayPaymentResult = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export async function openRazorpayCheckout(opts: PaymentCheckoutOptions) {
  const loaded = await loadRazorpay()
  if (!loaded) throw new Error('Razorpay SDK failed to load')

  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
  if (!keyId) console.warn('[Razorpay] API key not configured')

  const options = {
    key: keyId,
    amount: opts.orderAmount * 100,
    currency: opts.currency,
    name: 'AI Learning OS',
    description: opts.orderDescription,
    prefill: { name: opts.userName || '', email: opts.userEmail || '' },
    theme: { color: '#2563eb' },
    handler: (response: RazorpayPaymentResult) => opts.onSuccess({
      gateway: 'razorpay',
      transactionId: response.razorpay_payment_id,
      orderId: response.razorpay_order_id,
      signature: response.razorpay_signature,
      raw: response
    }),
    modal: { ondismiss: opts.onDismiss }
  }

  new (window as any).Razorpay(options).open()
}

// ------------------------------
// 2. Cashfree Integration
// ------------------------------
const cashfreeLoaded = { value: false }

async function loadCashfree(): Promise<boolean> {
  return loadScript('https://sdk.cashfree.com/js/v3/cashfree.js', cashfreeLoaded)
}

export type CashfreePaymentSession = {
  paymentSessionId: string
  orderId: string
  amount: number
  currency: string
}

export async function openCashfreeCheckout(opts: PaymentCheckoutOptions) {
  const loaded = await loadCashfree()
  if (!loaded) throw new Error('Cashfree SDK failed to load')

  const appId = import.meta.env.VITE_CASHFREE_APP_ID || ''
  if (!appId) console.warn('[Cashfree] App ID not configured')

  try {
    const response = await fetch('/api/cashfree/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: opts.orderAmount,
        customerName: opts.userName || 'Guest Student',
        customerEmail: opts.userEmail || 'guest@example.com',
        customerPhone: '9999999999'
      })
    });

    const sessionData = await response.json();
    if (!response.ok) throw new Error(sessionData.error || 'Failed to initialize payment session');

    const cashfree = window.Cashfree({ 
      mode: import.meta.env.PROD ? 'production' : 'sandbox' 
    })
    
    cashfree.checkout({
      paymentSessionId: sessionData.paymentSessionId,
      onSuccess: (data) => opts.onSuccess({
        gateway: 'cashfree',
        transactionId: data.transactionId,
        orderId: data.orderId,
        raw: data
      }),
      onFailure: (error) => opts.onError?.(new Error(error.message)),
      onDismiss: opts.onDismiss
    })
  } catch (error) {
    console.error('Cashfree initialize error:', error);
    opts.onError?.(error instanceof Error ? error : new Error('Payment initialization failed'));
  }
}

export function isCashfreeConfigured(): boolean {
  return !!import.meta.env.VITE_CASHFREE_APP_ID
}

// ------------------------------
// 3. PayPal Integration
// ------------------------------
const paypalLoaded = { value: false }

async function loadPayPal(currency: string = 'USD'): Promise<boolean> {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'
  return loadScript(`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`, paypalLoaded)
}

export async function initializePayPalButton(containerId: string, opts: PaymentCheckoutOptions) {
  await loadPayPal(opts.currency || 'USD')

  if (!window.paypal) throw new Error('PayPal SDK failed to load')

  window.paypal.Buttons({
    createOrder: async () => {
      // Create order on backend
      try {
        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: opts.orderAmount,
            currency: opts.currency || 'USD',
            description: opts.orderDescription
          })
        })
        const orderData = await response.json()
        return orderData.id
      } catch (error) {
        console.error('PayPal order creation failed:', error)
        throw new Error('Failed to create payment order')
      }
    },
    onApprove: async (data, actions) => {
      try {
        // Capture payment on frontend
        const details = await actions.order.capture()
        
        // Verify payment on backend
        const response = await fetch('/api/paypal/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: data.orderID,
            payerID: details.payer.payer_id
          })
        })
        
        if (!response.ok) {
          throw new Error('Payment verification failed')
        }
        
        const verificationData = await response.json()
        
        opts.onSuccess({
          gateway: 'paypal',
          transactionId: details.id,
          orderId: verificationData.orderId || data.orderID,
          raw: details
        })
      } catch (error) {
        console.error('PayPal payment capture failed:', error)
        opts.onError?.(new Error('Payment verification failed'))
      }
    },
    onError: (err: { message: string }) => opts.onError?.(new Error(err.message)),
    onCancel: opts.onDismiss
  }).render(`#${containerId}`)
}

export function isPayPalConfigured(): boolean {
  return !!import.meta.env.VITE_PAYPAL_CLIENT_ID
}

// ------------------------------
// 4. Wise Payout Integration
// ------------------------------
export type WiseQuote = {
  id: string
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  rate: number
  fee: number
  estimatedDelivery: string
}

export type WiseRecipient = {
  id: string
  name: string
  accountDetails: Record<string, string>
  currency: string
}

export const WiseAPI = {
  async createQuote(sourceCurrency: string, targetCurrency: string, amount: number): Promise<WiseQuote> {
    // Backend API call placeholder - Wise requires server-side authentication
    console.log('[Wise] Creating quote', { sourceCurrency, targetCurrency, amount })
    return { id: 'quote_demo', sourceCurrency, targetCurrency, sourceAmount: amount, targetAmount: amount * 0.97, rate: 0.97, fee: amount * 0.03, estimatedDelivery: new Date().toISOString() }
  },

  async createRecipient(recipientData: Partial<WiseRecipient>): Promise<WiseRecipient> {
    console.log('[Wise] Creating recipient', recipientData)
    return { id: 'recipient_demo', name: recipientData.name || '', accountDetails: {}, currency: recipientData.currency || 'USD' }
  },

  async initiateTransfer(quoteId: string, recipientId: string): Promise<string> {
    console.log('[Wise] Initiating transfer', { quoteId, recipientId })
    return 'transfer_demo_id'
  }
}

// ------------------------------
// Unified Payment Facade
// ------------------------------
export function getAvailableGateways(region: string, currency: string): PaymentGateway[] {
  const gateways: PaymentGateway[] = []
  const isIndia = region.toLowerCase() === 'in'

  if (isIndia) {
    gateways.push('razorpay')
    if (isCashfreeConfigured()) gateways.push('cashfree')
  }

  if (isPayPalConfigured() && !['INR'].includes(currency.toUpperCase())) {
    gateways.push('paypal')
  }

  return gateways
}

export async function processPayment(gateway: PaymentGateway, options: PaymentCheckoutOptions) {
  switch (gateway) {
    case 'razorpay':
      return openRazorpayCheckout(options)
    case 'cashfree':
      return openCashfreeCheckout(options)
    case 'paypal':
      return initializePayPalButton('paypal-button-container', options)
    default:
      throw new Error(`Unsupported payment gateway: ${gateway}`)
  }
}
