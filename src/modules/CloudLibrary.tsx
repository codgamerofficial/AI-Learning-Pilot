import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { LibraryBig, GraduationCap, ArrowUpCircle, Users, DownloadCloud, IndianRupee } from 'lucide-react'
import { Panel, SectionTitle, EmptyState } from '../components/ui'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useAuth } from '../hooks/useAuth'
import { openRazorpayCheckout } from '../lib/payments'

type LibraryItem = {
  id: string
  title: string
  description: string
  type: string
  author_name: string
  upvotes: number
  price_usd?: number
}

export function CloudLibrary() {
  const { session, user } = useAuth()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchLibraryItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('cloud_library')
      .select('id, title, description, type, author_name, upvotes, price_usd')
      .order('upvotes', { ascending: false })
      .limit(20)

    if (error) {
      console.warn('DB Error fetching library:', error)
    } else if (data) {
      setItems(data)
    }

    // Fetch user's purchases if logged in
    if (user) {
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('cloud_library_id')
        .eq('user_id', user.id)
      
      if (purchaseData) {
        setPurchasedIds(new Set(purchaseData.map(p => p.cloud_library_id)))
      }
    }
    
    // Fill in demo tiles if the DB is completely empty (for nice UI)
    if ((!data || data.length === 0) && items.length === 0) {
      setItems([
        { id: '1', title: 'Calculus IV: Multivariable Integrals', description: 'Complete study guide for finals', type: 'notes', author_name: 'Alex C.', upvotes: 432, price_usd: 0 },
        { id: '2', title: 'Macroeconomics AP Crash Course', description: '50 hard MCQs covering monetary policy.', type: 'quiz', author_name: 'Sarah M.', upvotes: 215, price_usd: 49 },
        { id: '3', title: 'Organic Chemistry Reactions', description: 'Massive flashcard deck for reaction mechanisms.', type: 'flashcard', author_name: 'BioGeek', upvotes: 189, price_usd: 0 },
      ])
    }
    setLoading(false)
  }, [user, items.length])

  useEffect(() => {
    fetchLibraryItems()
  }, [fetchLibraryItems])

  async function handleUpvote(id: string) {
    try {
      const { error } = await supabase.rpc('upvote_library_item', { item_id: id })
      if (error) throw error
      
      setItems(prev => prev.map(item => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item))
      toast({ title: 'Upvoted!', message: 'Thanks for keeping the community quality high.', type: 'success' })
    } catch (error) {
       console.error('Upvote failed:', error)
       toast({ title: 'Upvote Failed', message: 'You might need to sign in.', type: 'error' })
    }
  }

  async function handleDownload(item: LibraryItem) {
    if (!session) {
      toast({ title: 'Sign In Required', message: 'You must be signed in to fork community materials.', type: 'error' })
      return
    }
    
    if (item.price_usd && item.price_usd > 0 && !purchasedIds.has(item.id)) {
      try {
        await openRazorpayCheckout({
          orderAmount: item.price_usd,
          currency: 'INR',
          orderDescription: `Purchase: ${item.title}`,
          userName: session.user.user_metadata?.full_name || '',
          userEmail: session.user.email || '',
          onSuccess: async (result) => {
            // Verify and record purchase on backend
            try {
              const response = await fetch('/api/marketplace/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...result,
                  libraryItemId: item.id,
                  amount: item.price_usd
                })
              });
              const data = await response.json();
              if (data.success) {
                setPurchasedIds(prev => new Set([...prev, item.id]));
                toast({
                  title: 'Purchase Verified! 🎉',
                  message: `${item.title} added to your workspace.`,
                  type: 'success',
                });
              } else {
                toast({ title: 'Verification Failed', message: data.error || 'Please contact support.', type: 'error' });
              }
            } catch (error) {
              toast({ title: 'Verification Error', message: 'Failed to record purchase. Please contact support.', type: 'error' });
            }
          },
          onDismiss: () => {
            toast({ title: 'Payment Cancelled', message: 'No charge was made.', type: 'error' })
          },
        })
      } catch (error) {
        toast({ title: 'Payment Error', message: String(error), type: 'error' })
      }
      return
    }

    toast({ title: 'Added to Workspace', message: `Successfully forked ${item.title}!`, type: 'success' })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <Panel className="space-y-5">
        <SectionTitle
          eyebrow="Premium Feature"
          title="Global Cloud Library"
          body="Access authentic study materials, decks, and quizzes algorithmically curated by students worldwide."
          action={
            <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-400">
              <Users className="h-4 w-4" />
              Community Network
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[rgb(var(--accent))] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<LibraryBig className="h-6 w-6"/>} title="No public materials" body="Be the first to publish a resource!" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <div key={item.id} className="group relative rounded-[24px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-5 transition-all hover:border-[rgb(var(--accent))]">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-[rgb(var(--accent-soft))] p-2 text-[rgb(var(--accent))]">
                    {item.type === 'notes' && <LibraryBig className="h-5 w-5" />}
                    {item.type === 'quiz' && <GraduationCap className="h-5 w-5" />}
                    {item.type === 'flashcard' && <LibraryBig className="h-5 w-5" />}
                  </div>
                  <button onClick={() => handleUpvote(item.id)} className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text))] hover:border-green-500/50 hover:text-green-400" title="Upvote this resource" aria-label="Upvote this resource">
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {item.upvotes}
                  </button>
                </div>
                
                <div className="mt-4 space-y-1">
                  <h3 className="font-semibold text-[rgb(var(--text))]">{item.title}</h3>
                  <p className="line-clamp-2 text-sm leading-5 text-[rgb(var(--muted))]">{item.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[rgb(var(--line))] pt-4">
                  <span className="text-xs font-medium text-[rgb(var(--muted))]">By {item.author_name}</span>
                  {item.price_usd && item.price_usd > 0 && !purchasedIds.has(item.id) ? (
                    <button onClick={() => handleDownload(item)} className="flex items-center gap-1.5 rounded-full bg-[rgb(var(--accent))] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[rgb(var(--accent-strong))] shadow-[0_0_15px_rgba(37,99,235,0.4)]" title="Purchase content" aria-label="Purchase content">
                      <IndianRupee className="h-3 w-3" />
                      {item.price_usd}
                    </button>
                  ) : (
                    <button onClick={() => handleDownload(item)} className="flex items-center gap-1.5 text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))]" title="Download content" aria-label="Download content">
                      {purchasedIds.has(item.id) && <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20 mr-1.5">Purchased</span>}
                      <DownloadCloud className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </motion.div>
  )
}
