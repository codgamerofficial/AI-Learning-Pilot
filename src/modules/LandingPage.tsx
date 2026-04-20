import { motion } from 'framer-motion'
import {
  ArrowRight,
  CreditCard,
  Globe2,
  LogIn,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const vibeTiles = [
  {
    name: 'Runway Monochrome',
    description: 'Editorial black-and-ivory layouts with cinematic contrast.',
    color: 'from-zinc-100/90 via-zinc-300/70 to-zinc-500/50',
  },
  {
    name: 'Risograph Blocks',
    description: 'Inky overlays, grain, and bold geometry for campaign drops.',
    color: 'from-fuchsia-300/80 via-amber-300/70 to-cyan-300/70',
  },
  {
    name: 'Technicolour Neon',
    description: 'Saturated highlights and fluid motion accents for hero promos.',
    color: 'from-blue-400/80 via-violet-500/70 to-pink-500/70',
  },
  {
    name: 'Gothic Clay',
    description: 'Dark luxe tones with tactile depth for premium product stories.',
    color: 'from-stone-700/80 via-red-900/60 to-zinc-900/70',
  },
]

const paymentRail = [
  {
    name: 'Razorpay',
    detail: 'UPI, cards, and wallets for domestic checkout in India.',
    icon: CreditCard,
  },
  {
    name: 'Cashfree',
    detail: 'Fast settlement rails and multi-channel payment collection.',
    icon: ShieldCheck,
  },
  {
    name: 'Wise + PayPal',
    detail: 'Cross-border payout + trusted global buyer checkout options.',
    icon: Globe2,
  },
]

const commerceRail = [
  {
    title: 'Launch-ready storefront',
    detail: 'Premium sections for lookbooks, launches, and story-led capsules.',
    icon: ShoppingBag,
  },
  {
    title: 'Qikink POD shipping',
    detail: 'Print-on-demand flow aligned for order routing and delivery handling.',
    icon: Truck,
  },
  {
    title: 'Micro-motion UI',
    detail: 'Smooth page transitions, hover depth, and ambient motion graphics.',
    icon: Zap,
  },
]

export function LandingPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen overflow-hidden bg-[#08080d] text-zinc-100 selection:bg-fuchsia-400/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] top-[10%] h-[380px] w-[380px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[5%] top-[5%] h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[35%] h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-8 md:px-8">
        <nav className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] uppercase">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
            Build Web Apps Studio
          </div>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </button>
        </nav>

        <main className="pt-16 md:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="space-y-7"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/30 bg-fuchsia-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                Premium Fashion Commerce UX
              </div>

              <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
                Monochrome drama.
                <br />
                <span className="bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                  Technicolour motion.
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-zinc-300">
                A premium storefront direction for your new clothing brand with runway-grade layout, smooth motion graphics,
                colourblock campaigns, and production-ready commerce rails.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {commerceRail.map(({ title, detail, icon: Icon }, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.08 }}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{detail}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-zinc-900 px-6 py-3 font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start building store
                  <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-sm text-zinc-400">Checkout-ready: Razorpay, Cashfree, Wise, PayPal • Shipping: Qikink POD</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {vibeTiles.map((tile) => (
                  <div key={tile.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                    <div className={`h-24 rounded-2xl bg-gradient-to-br ${tile.color}`} />
                    <p className="mt-3 text-sm font-semibold">{tile.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{tile.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Package className="h-4 w-4" />
                  Payments & Delivery Stack
                </div>
                <div className="space-y-2">
                  {paymentRail.map(({ name, detail, icon: Icon }) => (
                    <div key={name} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
                      <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-zinc-400">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
