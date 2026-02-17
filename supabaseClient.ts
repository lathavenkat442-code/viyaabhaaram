
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// INSTRUCTIONS FOR SUPABASE SETUP:
// 1. Go to https://supabase.com and create a new project.
// 2. Get your URL and ANON KEY from Project Settings -> API
// 3. Create a .env file in your project root and add:
//    VITE_SUPABASE_URL=your_url_here
//    VITE_SUPABASE_ANON_KEY=your_key_here

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseInstance: SupabaseClient;

// Mock client generator to prevent runtime crashes
const createMockClient = () => {
  // Use console.log or info instead of warn to avoid aggressive overlay errors in some dev tools
  console.info("Viyabaari: Supabase credentials missing. App running in offline/demo mode.");
  
  const dummyPromise = Promise.resolve({ 
    data: null, 
    error: { message: "Supabase not configured (Offline Mode)" } 
  });
  
  const dummyChain: any = {
    select: () => dummyChain,
    insert: () => dummyChain,
    update: () => dummyChain,
    upsert: () => dummyChain,
    delete: () => dummyChain,
    eq: () => dummyChain,
    single: () => dummyChain,
    order: () => dummyChain,
    limit: () => dummyChain,
    then: (resolve: any) => resolve({ data: null, error: { message: "Supabase not configured" } })
  };

  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: () => dummyPromise,
      signInWithPassword: () => dummyPromise,
      signOut: () => dummyPromise,
      resetPasswordForEmail: () => dummyPromise
    },
    from: () => dummyChain,
    channel: () => ({
        on: () => ({ on: () => ({ subscribe: () => {} }) }),
        subscribe: () => {},
        unsubscribe: () => {}
    }),
    removeChannel: () => {}
  } as unknown as SupabaseClient;
};

try {
  // Ensure keys are present and are non-empty strings
  if (supabaseUrl && typeof supabaseUrl === 'string' && supabaseUrl.trim().length > 0 &&
      supabaseAnonKey && typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim().length > 0) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    supabaseInstance = createMockClient();
  }
} catch (error) {
  console.error("Error initializing Supabase client:", error);
  supabaseInstance = createMockClient();
}

export const supabase = supabaseInstance;
