-- Supabase Schema for AI Learning OS (Idempotent / Safe to re-run)

-- 1. User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  value_json jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_key UNIQUE (user_id, key)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Cloud Library Table
CREATE TABLE IF NOT EXISTS public.cloud_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('flashcard', 'notes', 'quiz')),
  content_json jsonb NOT NULL,
  upvotes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrations: Safely add Monetization Columns if they don't exist
ALTER TABLE public.cloud_library ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 0;
ALTER TABLE public.cloud_library ADD COLUMN IF NOT EXISTS razorpay_plan_id text;

ALTER TABLE public.cloud_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cloud_library" ON public.cloud_library;
CREATE POLICY "Anyone can read cloud_library"
  ON public.cloud_library
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert into cloud_library" ON public.cloud_library;
CREATE POLICY "Users can insert into cloud_library"
  ON public.cloud_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own library items" ON public.cloud_library;
CREATE POLICY "Users can update their own library items"
  ON public.cloud_library
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own library items" ON public.cloud_library;
CREATE POLICY "Users can delete their own library items"
  ON public.cloud_library
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Purchases Table (Marketplace Monetization)
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cloud_library_id uuid REFERENCES public.cloud_library(id) ON DELETE RESTRICT NOT NULL,
  razorpay_payment_id text NOT NULL,
  amount_usd numeric NOT NULL,
  purchased_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_purchase UNIQUE (user_id, cloud_library_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. User Profiles Table (SaaS Subscriptions)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  razorpay_customer_id text,
  subscription_status text DEFAULT 'free',
  tokens_used integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, subscription_status)
  VALUES (new.id, 'free');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RPC function for upvoting
CREATE OR REPLACE FUNCTION public.upvote_library_item(item_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.cloud_library
  SET upvotes = upvotes + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
