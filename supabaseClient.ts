import { createClient, SupabaseClient } from '@supabase/supabase-js';

// INSTRUCTIONS FOR SUPABASE SETUP:
// 1. Go to https://supabase.com and create a new project.
// 2. Go to the SQL Editor and run the following queries to create tables:
/*
  create table stock_items (
    id text primary key,
    user_id uuid references auth.users not null,
    content jsonb
  );

  create table transactions (
    id text primary key,
    user_id uuid references auth.users not null,
    content jsonb
  );

  -- Enable Security
  alter table stock_items enable row level security;
  alter table transactions enable row level security;

  create policy "Users can see their own stocks" on stock_items for all using (auth.uid() = user_id);
  create policy "Users can see their own transactions" on transactions for all using (auth.uid() = user_id);
*/

// 3. Get your URL and ANON KEY from Project Settings -> API
// 4. Create a .env file in your project root and add:
//    VITE_SUPABASE_URL=your_url_here
//    VITE_SUPABASE_ANON_KEY=your_key_here

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Viyabaari: Supabase credentials missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). App running in offline/demo mode.");
  
  // Mock client to prevent runtime crashes when env vars are missing
  const dummyPromise = Promise.resolve({ data: null, error: { message: "Supabase not configured. Check console for details." } });
  
  // Chainable dummy object for DB operations
  const dummyChain: any = {
    select: () => dummyChain,
    insert: () => dummyChain,
    update: () => dummyChain,
    upsert: () => dummyChain,
    delete: () => dummyChain,
    eq: () => dummyChain,
    single: () => dummyChain,
    // Make it thenable so await works
    then: (resolve: any) => resolve({ data: null, error: { message: "Supabase not configured" } })
  };

  supabaseInstance = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: () => dummyPromise,
      signInWithPassword: () => dummyPromise,
      signOut: () => dummyPromise,
    },
    from: () => dummyChain
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;
