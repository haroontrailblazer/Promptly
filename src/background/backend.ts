import type { SupabaseClient } from '@supabase/supabase-js';
import type { LibraryPrompt } from '../shared/types';
import { PUBLIC_PROMPTS } from '../shared/publicPrompts';

// Filled in when the Promptly Supabase project is provisioned. The anon key is
// public by design — row-level security enforces per-user access.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const backendConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Session persistence backed by chrome.storage.local (service workers have no
// localStorage).
const chromeStorage = {
  getItem: async (key: string) =>
    ((await chrome.storage.local.get(key))[key] as string | undefined) ?? null,
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  },
};

// Loaded lazily so the service worker never pays for (or risks crashing on)
// the supabase bundle unless the backend is actually configured.
let client: SupabaseClient | null = null;
async function supa(): Promise<SupabaseClient> {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

const NOT_CONNECTED = 'Account sync is not connected yet — your library is stored on this device.';

export async function authStatus(): Promise<string | null> {
  if (!backendConfigured()) return null;
  const { data } = await (await supa()).auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signIn(email: string, password: string): Promise<string> {
  if (!backendConfigured()) throw new Error(NOT_CONNECTED);
  const { data, error } = await (await supa()).auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user?.email ?? email;
}

export async function signUp(email: string, password: string): Promise<string | null> {
  if (!backendConfigured()) throw new Error(NOT_CONNECTED);
  const { data, error } = await (await supa()).auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  // No session means email confirmation is pending.
  return data.session ? (data.user?.email ?? email) : null;
}

export async function signOut(): Promise<void> {
  if (!backendConfigured()) return;
  await (await supa()).auth.signOut();
}

// ---------- Personal library: cloud when signed in, device otherwise ----------

const LOCAL_KEY = 'library';

async function localList(): Promise<LibraryPrompt[]> {
  const res = await chrome.storage.local.get(LOCAL_KEY);
  return (res[LOCAL_KEY] as LibraryPrompt[] | undefined) ?? [];
}

async function signedIn(): Promise<boolean> {
  return (await authStatus()) !== null;
}

export async function listPrompts(): Promise<LibraryPrompt[]> {
  if (await signedIn()) {
    const { data, error } = await (
      await supa()
    )
      .from('promptly_prompts')
      .select('id, title, text, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      title: r.title as string,
      text: r.text as string,
      createdAt: Date.parse(r.created_at as string),
    }));
  }
  return localList();
}

export async function savePrompt(title: string, text: string): Promise<void> {
  if (await signedIn()) {
    const { error } = await (await supa()).from('promptly_prompts').insert({ title, text });
    if (error) throw new Error(error.message);
    return;
  }
  const prompts = await localList();
  prompts.unshift({
    id: `local-${Date.now()}-${prompts.length}`,
    title,
    text,
    createdAt: Date.now(),
  });
  await chrome.storage.local.set({ [LOCAL_KEY]: prompts });
}

export async function deletePrompt(id: string): Promise<void> {
  if (await signedIn()) {
    const { error } = await (await supa()).from('promptly_prompts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const prompts = (await localList()).filter((p) => p.id !== id);
  await chrome.storage.local.set({ [LOCAL_KEY]: prompts });
}

export async function listPublicPrompts(): Promise<LibraryPrompt[]> {
  if (backendConfigured()) {
    try {
      const { data, error } = await (
        await supa()
      )
        .from('promptly_public_prompts')
        .select('id, title, text, category')
        .order('category');
      if (!error && data?.length) {
        return data.map((r) => ({
          id: String(r.id),
          title: r.title as string,
          text: r.text as string,
          category: (r.category as string) ?? undefined,
          createdAt: 0,
        }));
      }
    } catch {
      /* fall through to the bundle */
    }
  }
  return PUBLIC_PROMPTS;
}
