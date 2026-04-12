-- ============================================================
-- YSport — Migration Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Table profiles (étend auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  handle       TEXT UNIQUE,
  initial      TEXT DEFAULT '',
  points       INTEGER NOT NULL DEFAULT 0,
  sports       TEXT[] NOT NULL DEFAULT '{}',
  badges       TEXT[] NOT NULL DEFAULT '{}',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger : auto-génère handle et initial si absents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.handle IS NULL THEN
    NEW.handle := '@' || lower(regexp_replace(NEW.name, '\s+', '', 'g')) ||
                  floor(random() * 999)::text;
  END IF;
  IF NEW.initial IS NULL OR NEW.initial = '' THEN
    NEW.initial := upper(left(trim(NEW.name), 1));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_insert ON public.profiles;
CREATE TRIGGER on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Table events
CREATE TABLE IF NOT EXISTS public.events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id          TEXT NOT NULL,
  spot_name        TEXT,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('manual','auto-recurring','auto-challenge')),
  sport            TEXT NOT NULL,
  organizer_id     UUID NOT NULL REFERENCES public.profiles(id),
  organizer_name   TEXT,
  participants     UUID[] NOT NULL DEFAULT '{}',
  max_participants INTEGER,
  scheduled_at     TIMESTAMPTZ,
  is_live          BOOLEAN NOT NULL DEFAULT FALSE,
  description      TEXT,
  is_sponsor       BOOLEAN NOT NULL DEFAULT FALSE,
  sponsor_name     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id      TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES public.profiles(id),
  user_name    TEXT,
  user_initial TEXT,
  user_level   TEXT,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT NOT NULL,
  sport        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_spot_id_idx ON public.reviews(spot_id);

-- 4. Table point_transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL CHECK (reason IN (
               'session','sessionWithTimer','eventCreated',
               'eventJoined','presenceOnVenue','reviewPosted','streakBonus')),
  spot_id    TEXT,
  event_id   UUID REFERENCES public.events(id),
  label      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS point_transactions_user_id_idx ON public.point_transactions(user_id);

-- 5. Row Level Security
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_server" ON public.profiles;

CREATE POLICY "profiles_select"        ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own"    ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_server" ON public.profiles FOR INSERT WITH CHECK (TRUE);

-- events
DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_insert_auth"   ON public.events;

CREATE POLICY "events_select_public" ON public.events FOR SELECT USING (TRUE);
CREATE POLICY "events_insert_auth"   ON public.events FOR INSERT WITH CHECK (TRUE);

-- reviews
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_server" ON public.reviews;

CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_server" ON public.reviews FOR INSERT WITH CHECK (TRUE);

-- point_transactions
DROP POLICY IF EXISTS "transactions_select_own"    ON public.point_transactions;
DROP POLICY IF EXISTS "transactions_insert_server" ON public.point_transactions;

CREATE POLICY "transactions_select_own"    ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_server" ON public.point_transactions FOR INSERT WITH CHECK (TRUE);
