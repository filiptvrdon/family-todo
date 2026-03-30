-- Allow any authenticated user to view any profile.
-- Needed so a user can search for their partner by email to connect accounts.
-- Safe for this app: it's a private 2-person app, not a public platform.
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');
