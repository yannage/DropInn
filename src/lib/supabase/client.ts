import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let client: SupabaseClient | null = null;

const getSessionNamespace = () => {
  if (typeof window === 'undefined') return '';

  const raw = new URLSearchParams(window.location.search).get('session')?.trim();
  return raw ? `-${raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}` : '';
};

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

export const isLocalhost = () => (
  typeof window !== 'undefined'
  && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
);

export const shouldUseLocalDevFallback = () => !isSupabaseConfigured() && isLocalhost();

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null;

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: `dropinn-auth${getSessionNamespace()}`,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return client;
};

export const requireSupabaseClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

export const ensureAnonymousUser = async (): Promise<User | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const currentSession = await supabase.auth.getSession();
  if (currentSession.error) throw currentSession.error;
  if (currentSession.data.session?.user) return currentSession.data.session.user;

  const response = await supabase.auth.signInAnonymously();
  if (response.error) throw response.error;

  return response.data.user;
};

