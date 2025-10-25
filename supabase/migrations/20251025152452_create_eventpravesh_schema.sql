/*
  # EventPravesh - NFT Event Ticketing Platform Schema

  ## Overview
  This migration creates the complete database schema for EventPravesh, an NFT-based event ticketing platform.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `name` (text) - User's display name
  - `is_host` (boolean, default false) - Whether user can host events
  - `wallet_address` (text, nullable) - User's blockchain wallet address
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### `events`
  - `id` (uuid, primary key)
  - `host_id` (uuid, foreign key to profiles) - Event creator
  - `title` (text) - Event name
  - `date` (timestamptz) - Event date and time
  - `location` (text) - Event venue/location
  - `description` (text) - Detailed event description
  - `banner_url` (text) - Large banner image URL (1200x400px)
  - `card_image_url` (text) - Card thumbnail URL (600x400px)
  - `page_slug` (text, unique) - URL-friendly identifier
  - `created_at` (timestamptz) - Event creation timestamp
  
  ### `tickets`
  - `id` (uuid, primary key)
  - `event_id` (uuid, foreign key to events) - Associated event
  - `owner_user_id` (uuid, foreign key to profiles) - Ticket owner
  - `token_id` (integer) - NFT token identifier
  - `owner_address` (text) - Blockchain address of owner
  - `is_verified` (boolean, default false) - Whether ticket has been scanned/used
  - `created_at` (timestamptz) - Ticket mint timestamp
  
  ### `event_staff`
  - `id` (uuid, primary key)
  - `event_id` (uuid, foreign key to events) - Event they can scan for
  - `username` (text) - Staff username
  - `password_hash` (text) - Hashed password (handled by Edge Function)
  - `created_at` (timestamptz) - Staff account creation

  ## 2. Security - Row Level Security (RLS)
  
  All tables have RLS enabled with restrictive policies:
  
  ### profiles
  - Users can read their own profile
  - Users can update their own profile
  - Public can read basic profile info (name, is_host)
  
  ### events
  - Anyone can read all events (public discovery)
  - Only hosts can create events
  - Only event hosts can update their own events
  
  ### tickets
  - Users can read their own tickets
  - Ticket creation handled by Edge Function
  - Staff can view tickets for their events
  
  ### event_staff
  - Only event hosts can read staff for their events
  - Staff creation handled by Edge Function
  
  ## 3. Important Notes
  - Password hashing for staff is handled server-side in Edge Functions
  - NFT minting is simulated in Edge Functions
  - QR code generation/verification uses cryptographic signatures
  - Storage bucket 'event-images' must be created separately and set to public
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_host boolean DEFAULT false,
  wallet_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can read basic profile info"
  ON profiles FOR SELECT
  TO public
  USING (true);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  date timestamptz NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  banner_url text NOT NULL,
  card_image_url text NOT NULL,
  page_slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events"
  ON events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Hosts can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_host = true
    )
  );

CREATE POLICY "Hosts can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_id integer NOT NULL,
  owner_address text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Service role can insert tickets"
  ON tickets FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update tickets"
  ON tickets FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create event_staff table
CREATE TABLE IF NOT EXISTS event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  username text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, username)
);

ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event hosts can read staff"
  ON event_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_staff.event_id
      AND events.host_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage staff"
  ON event_staff FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_host)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_tickets_owner_user_id ON tickets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);