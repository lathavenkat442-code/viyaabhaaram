
import { createClient } from '@supabase/supabase-js';

// INSTRUCTIONS FOR SUPABASE SETUP:
// 1. Go to https://supabase.com and create a new project.
// 2. Get your URL and ANON KEY from Project Settings -> API
// 3. Create a .env file in your project root and add:
//    VITE_SUPABASE_URL=your_url_here
//    VITE_SUPABASE_ANON_KEY=your_key_here

const env = (import.meta as any).env || {};
const envUrl = env.VITE_SUPABASE_URL;
const envKey = env.VITE_SUPABASE_ANON_KEY;

// Fallback: Check LocalStorage (allows users to input keys in UI if .env is missing)
const localUrl = localStorage.getItem('viyabaari_supabase_url');
const localKey = localStorage.getItem('viyabaari_supabase_key');

const supabaseUrl = envUrl || localUrl;
const supabaseAnonKey = envKey || localKey;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined');

if (!isSupabaseConfigured) {
  console.warn("Viyabaari: Supabase credentials missing. Online features will disabled until configured.");
}

// Initialize the client directly.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// Helper to save config from UI
export const saveSupabaseConfig = (url: string, key: string) => {
    if (!url || !key) return;
    localStorage.setItem('viyabaari_supabase_url', url.trim());
    localStorage.setItem('viyabaari_supabase_key', key.trim());
    window.location.reload();
};

export const resetSupabaseConfig = () => {
    localStorage.removeItem('viyabaari_supabase_url');
    localStorage.removeItem('viyabaari_supabase_key');
    window.location.reload();
};
