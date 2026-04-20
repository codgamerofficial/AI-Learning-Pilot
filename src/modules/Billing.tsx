import { motion } from 'framer-motion'
import { Sparkles, CheckCircle2, Zap, IndianRupee, Globe, CreditCard, DollarSign } from 'lucide-react'
import { Panel, SectionTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../lib/toast'
import { getAvailableGateways, processPayment } from '../lib/payments'
import type { PaymentGateway } from '../lib/payments'

export function Billing() {
  const { session, profile, refreshProfile } = useAuth()

  const handleGatewayPayment = async (gateway: PaymentGateway) => {
    if (!session) {
      toast({ title: 'Sign in to upgrade', message: 'Please create an account to activate OS Pro.', type: 'error' })
      return
    }

    try {
      await processPayment(gateway, {
        orderAmount: 499,
        currency: 'INR',
        orderDescription: 'AI Learning OS Pro — Monthly Subscription',
        userName: session.user.user_metadata?.full_name || '',
        userEmail: session.user.email || '',
        onSuccess: async (result) => {
          toast({
            title: 'Payment Successful! 🎉',
            message: `Transaction ID: ${result.transactionId} via ${result.gateway}`,
            type: 'success',
          })
          // Call backend to verify signature and activate subscription
          try {
            const response = await fetch('/api/subscription/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result)
            });
            const data = await response.json();
            if (data.success) {
              await refreshProfile()
              toast({
                title: 'Subscription Activated!',
                message: 'Welcome to OS Pro! Your subscription is now active.',
                type: 'success',
              });
            } else {
              toast({
                title: 'Activation Failed',
                message: data.error || 'Please contact support.',
                type: 'error',
              });
            }
          } catch (err) {
            toast({
              title: 'Activation Error',
              message: 'Failed to activate subscription. Please contact support.',
              type: 'error',
            });
          }
        },
        onDismiss: () => {
          toast({ title: 'Payment Cancelled', message: 'No worries — you can upgrade anytime.', type: 'error' })
        },
      })
    } catch (e) {
      toast({ title: 'Payment Error', message: String(e), type: 'error' })
    }
  }


  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <Panel className="space-y-8 p-10">
        <div className="text-center space-y-4">
          <SectionTitle
            title="Accelerate with AI Learning OS Pro"
            body="Break through token limits and tap into unlimited, advanced intelligence models for all your homework and summaries."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-10">
          
          {/* Free Tier */}
          <div className="rounded-[32px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-8 flex flex-col">
            <h3 className="font-display text-2xl font-bold text-[rgb(var(--text))] mb-2">Student Basic</h3>
            <div className="flex items-baseline gap-1 text-[rgb(var(--text))] mb-6">
              <span className="text-4xl font-extrabold">Free</span>
              <span className="text-[rgb(var(--muted))]">/ forever</span>
            </div>
            
            <ul className="space-y-4 text-sm text-[rgb(var(--muted))] flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[rgb(var(--accent))]" /> 10 AI Generations per month</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[rgb(var(--accent))]" /> Standard Model Engine</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[rgb(var(--accent))]" /> Read community study decks</li>
            </ul>

            <button disabled className="mt-8 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel))] py-3 text-sm font-semibold text-[rgb(var(--muted))]">
              {profile?.subscription_status === 'pro' ? 'Basic Tier' : 'Current Plan'}
            </button>
          </div>

          {/* Pro Tier (Razorpay Paywall) */}
          <div className="relative rounded-[32px] border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent p-8 shadow-[0_0_40px_rgba(37,99,235,0.15)] flex flex-col">
            <div className="absolute -top-4 right-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
              RECOMMENDED
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-blue-500 fill-blue-500/20" />
              <h3 className="font-display text-2xl font-bold text-[rgb(var(--text))]">OS Pro</h3>
            </div>
            
            <div className="flex items-baseline gap-1 text-[rgb(var(--text))] mb-6">
              <IndianRupee className="h-7 w-7" />
              <span className="text-4xl font-extrabold">499</span>
              <span className="text-blue-400 font-medium">/ month</span>
            </div>
            
            <ul className="space-y-4 text-sm text-[rgb(var(--text))] flex-1">
              <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-blue-400" /> Unlimited AI Generations</li>
              <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-blue-400" /> GPT-4o & Advanced Models</li>
              <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-blue-400" /> 0% Seller Fee on Cloud Library</li>
              <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-blue-400" /> Priority Support</li>
            </ul>

             <div className="mt-8 space-y-4">
                  <div className="space-y-2">
                     <div className="space-y-3">
                       {profile?.subscription_status === 'pro' ? (
                         <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-blue-500/20 bg-blue-500/5 text-center space-y-3">
                            <CheckCircle2 className="h-10 w-10 text-blue-500" />
                            <div>
                              <p className="font-bold text-blue-400">Pro Feature Unlocked</p>
                              <p className="text-xs text-[rgb(var(--muted))]">Your subscription is active and valid.</p>
                            </div>
                         </div>
                       ) : (
                         getAvailableGateways('IN', 'INR').map((gateway, index) => {
                           const gatewayConfigs: Record<string, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
                             razorpay: { label: 'Razorpay', icon: IndianRupee, color: 'from-blue-500 to-indigo-600' },
                             cashfree: { label: 'Cashfree', icon: CreditCard, color: 'from-green-500 to-emerald-600' },
                             paypal: { label: 'PayPal', icon: DollarSign, color: 'from-blue-500 to-blue-600' }
                           };
                           
                           const config = gatewayConfigs[gateway] || { label: gateway, icon: Sparkles, color: 'from-gray-500 to-gray-600' };
                           
                           return (
                             <button
                               key={index}
                               onClick={() => handleGatewayPayment(gateway)}
                               className={`w-full flex items-center justify-start gap-3 rounded-xl border border-[rgb(var(--line))] bg-gradient-to-r via-transparent ${config.color}/20 px-6 py-4 text-left font-medium text-[rgb(var(--text))] transition-all hover:bg-[rgb(var(--panel-strong))] hover:scale-[1.01] shadow-sm`}
                             >
                               <div className="flex-shrink-0">
                                 <config.icon className={`h-5 w-5 ${config.color}`} />
                               </div>
                               <div className="flex-1">
                                 <span className="block font-medium">{config.label}</span>
                                 <span className="text-xs text-[rgb(var(--muted))]">Secure payment processing</span>
                               </div>
                               <div className="flex-shrink-0">
                                 <IndianRupee className="h-4 w-4 opacity-70" />
                                 <span className="font-semibold">499</span>
                               </div>
                             </button>
                           );
                         })
                       )}
                     </div>
               </div>
             </div>
          </div>

        </div>

         {/* Payment Methods Info */}
         <div className="rounded-[24px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-6 mt-4">
           <div className="flex items-center gap-3 mb-4">
             <Globe className="h-5 w-5 text-[rgb(var(--accent))]" />
             <h4 className="font-semibold text-[rgb(var(--text))]">Accepted Payment Methods</h4>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {[
               { label: 'UPI / Google Pay', icon: 'wallet' },
               { label: 'Credit & Debit Cards', icon: 'credit-card' },
               { label: 'Net Banking', icon: 'banknote' },
               { label: 'International Cards', icon: 'globe' },
               { label: 'PayPal', icon: 'dollar-sign' },
               { label: 'Bank Transfer', icon: 'send-horizontal' }
             ].map((method, index) => {
               const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
                 wallet: Sparkles,
                 'credit-card': CreditCard,
                 banknote: Sparkles,
                 globe: Globe,
                 'dollar-sign': DollarSign,
                 'send-horizontal': Sparkles
               };
               
               const Icon = iconMap[method.icon] || Sparkles;
               
               return (
                 <div key={index} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--line))] bg-[rgb(var(--panel))] px-4 py-3">
                   <Icon className="h-4 w-4 text-[rgb(var(--accent))]" />
                   <span className="text-sm font-medium text-[rgb(var(--text))]">{method.label}</span>
                 </div>
               );
             })}
           </div>
         </div>
      </Panel>
    </motion.div>
  )
}
