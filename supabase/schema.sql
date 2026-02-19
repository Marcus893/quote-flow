-- QuoteFlow Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- Stores contractor business info
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  phone text,
  business_name text,
  logo_url text,
  payment_links jsonb default '{}'::jsonb,
  stripe_account_id text,
  terms_document text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'lifetime')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_expires_at timestamptz,
  follow_up_intervals jsonb default '[{"days": 2, "enabled": true}, {"days": 7, "enabled": true}, {"days": 15, "enabled": true}]'::jsonb,
  follow_up_subject text,
  follow_up_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles: users can read/update only their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. CUSTOMERS TABLE
-- Stores homeowner/client info per contractor
-- ============================================
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  contractor_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.customers enable row level security;

-- Customers: contractors can only see their own customers
create policy "Contractors can view own customers"
  on public.customers for select
  using (auth.uid() = contractor_id);

create policy "Contractors can insert own customers"
  on public.customers for insert
  with check (auth.uid() = contractor_id);

create policy "Contractors can update own customers"
  on public.customers for update
  using (auth.uid() = contractor_id);

create policy "Contractors can delete own customers"
  on public.customers for delete
  using (auth.uid() = contractor_id);

-- ============================================
-- 3. QUOTES TABLE
-- Stores quotes with line items, photos, status
-- ============================================
create table public.quotes (
  id uuid default uuid_generate_v4() primary key,
  contractor_id uuid references public.profiles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  quote_name text,
  items jsonb default '[]'::jsonb,
  total_price numeric(10,2) default 0,
  deposit_percentage numeric(5,2) default 0,
  status text default 'draft' check (status in ('draft', 'sent', 'viewed', 'signed', 'paid_deposit', 'paid_full')),
  photos text[] default '{}',
  signature_data text,
  notes text,
  edit_version integer default 1,
  viewed_at timestamptz,
  follow_up_2d boolean default false,
  follow_up_7d boolean default false,
  follow_up_15d boolean default false,
  follow_ups_sent jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.quotes enable row level security;

-- Quotes: contractors can manage their own quotes
create policy "Contractors can view own quotes"
  on public.quotes for select
  using (auth.uid() = contractor_id);

create policy "Contractors can insert own quotes"
  on public.quotes for insert
  with check (auth.uid() = contractor_id);

create policy "Contractors can update own quotes"
  on public.quotes for update
  using (auth.uid() = contractor_id);

create policy "Contractors can delete own quotes"
  on public.quotes for delete
  using (auth.uid() = contractor_id);

-- Public access for viewing quotes via shared link (homeowner view)
create policy "Anyone can view quotes by id"
  on public.quotes for select
  using (true);

-- Allow anonymous updates for signature (homeowner signing)
create policy "Anyone can update signature on quotes"
  on public.quotes for update
  using (true)
  with check (true);

-- ============================================
-- 4. STORAGE BUCKET for logos & photos
-- ============================================
-- Run these in Supabase SQL Editor:
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

-- ============================================
-- 5. PAYMENTS TABLE
-- Tracks all payments made on quotes
-- ============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  quote_id uuid references public.quotes(id) on delete cascade not null,
  amount numeric(10,2) not null,
  method text not null,
  notes text,
  receipt_url text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'invalid')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.payments enable row level security;

-- Anyone can view payments (for public quote page)
create policy "Anyone can view payments"
  on public.payments for select
  using (true);

-- Anyone can insert payments (homeowner submitting payment)
create policy "Anyone can insert payments"
  on public.payments for insert
  with check (true);

-- Anyone can update payments (contractor confirming payment)
create policy "Anyone can update payments"
  on public.payments for update
  using (true)
  with check (true);

-- Only authenticated users can delete payments (contractor marking as invalid)
create policy "Anyone can delete payments"
  on public.payments for delete
  using (auth.uid() is not null);

-- ============================================
-- 6. STORAGE BUCKET for logos & photos
-- ============================================
-- Storage policies for logos
create policy "Users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Storage policies for quote photos
create policy "Users can upload quote photos"
  on storage.objects for insert
  with check (bucket_id = 'quote-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own quote photos"
  on storage.objects for update
  using (bucket_id = 'quote-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Quote photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'quote-photos');

-- Storage policies for payment receipts (public bucket — anyone can upload/view)
create policy "Anyone can upload payment receipts"
  on storage.objects for insert
  with check (bucket_id = 'payment-receipts');

create policy "Payment receipts are publicly readable"
  on storage.objects for select
  using (bucket_id = 'payment-receipts');

-- ============================================
-- MIGRATION: Add quote_name column
-- Run this if table already exists:
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quote_name text;
-- ============================================

-- ============================================
-- MIGRATION: Payment & Signature system
-- Run these if tables already exist:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_links jsonb DEFAULT '{}';
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deposit_percentage numeric(5,2) DEFAULT 0;
-- CREATE TABLE IF NOT EXISTS public.payments (
--   id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
--   quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
--   amount numeric(10,2) NOT NULL,
--   method text NOT NULL,
--   notes text,
--   status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
--   created_at timestamptz DEFAULT now()
-- );
-- ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
-- CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
-- ============================================

-- ============================================
-- MIGRATION: Add status column to payments
-- Run this if payments table already exists:
-- ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
-- ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'confirmed', 'invalid'));
-- UPDATE public.payments SET status = 'confirmed' WHERE status IS NULL;
-- CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
-- ============================================

-- ============================================
-- MIGRATION: Allow 'invalid' status on payments
-- Run this if payments table already has status column with only pending/confirmed:
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
-- ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'confirmed', 'invalid'));
-- ============================================

-- ============================================
-- MIGRATION: Add Stripe Connect
-- Run this if profiles table already exists:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;
-- ============================================

-- ============================================
-- 7. QUOTE_EDITS TABLE
-- Tracks edit history when quotes are modified after being sent/signed
-- ============================================
create table public.quote_edits (
  id uuid default uuid_generate_v4() primary key,
  quote_id uuid references public.quotes(id) on delete cascade not null,
  previous_items jsonb not null,
  new_items jsonb not null,
  previous_total numeric(10,2) not null,
  new_total numeric(10,2) not null,
  previous_notes text,
  new_notes text,
  previous_deposit_percentage numeric(5,2) default 0,
  new_deposit_percentage numeric(5,2) default 0,
  edited_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.quote_edits enable row level security;

-- Anyone can view edit history (for public quote page)
create policy "Anyone can view quote edits"
  on public.quote_edits for select
  using (true);

-- Authenticated users can insert edits (contractor editing their own quote)
create policy "Anyone can insert quote edits"
  on public.quote_edits for insert
  with check (true);

-- ============================================
-- MIGRATION: Add quote_edits table and edit_version to quotes
-- Run these if tables already exist:
-- CREATE TABLE IF NOT EXISTS public.quote_edits (
--   id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
--   quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
--   previous_items jsonb NOT NULL,
--   new_items jsonb NOT NULL,
--   previous_total numeric(10,2) NOT NULL,
--   new_total numeric(10,2) NOT NULL,
--   previous_notes text,
--   new_notes text,
--   previous_deposit_percentage numeric(5,2) DEFAULT 0,
--   new_deposit_percentage numeric(5,2) DEFAULT 0,
--   edited_at timestamptz DEFAULT now(),
--   created_at timestamptz DEFAULT now()
-- );
-- ALTER TABLE public.quote_edits ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anyone can view quote edits" ON public.quote_edits FOR SELECT USING (true);
-- CREATE POLICY "Anyone can insert quote edits" ON public.quote_edits FOR INSERT WITH CHECK (true);
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS edit_version integer DEFAULT 1;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_document text;
-- CREATE POLICY "Anyone can delete payments" ON public.payments FOR DELETE USING (auth.uid() IS NOT NULL);
-- ============================================

-- ============================================
-- MIGRATION: Add subscription system to profiles
-- Run these if table already exists:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
-- ============================================

-- ============================================
-- MIGRATION: Add follow-up email customization to profiles
-- Run these if table already exists:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follow_up_intervals jsonb DEFAULT '[{"days": 2, "enabled": true}, {"days": 7, "enabled": true}, {"days": 15, "enabled": true}]'::jsonb;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follow_up_subject text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follow_up_message text;
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS follow_ups_sent jsonb DEFAULT '{}'::jsonb;
-- ============================================
