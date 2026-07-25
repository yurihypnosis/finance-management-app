import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { sb } from '../lib/supabase';
import { defaultState, type AppState } from '../lib/types';
import { monthKey, isoDate, canonicalSubName } from '../lib/calc';

const STORAGE_KEY = 'kakeibo-app-v2-state';

export type SyncStatus = 'idle' | 'pending' | 'saved' | 'error';

interface Store {
  session: Session | null;
  state: AppState | null;
  authReady: boolean;
  syncStatus: SyncStatus;
  bootstrap: () => Promise<void>;
  enterApp: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  setState: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
}

function userStorageKey(userId: string) {
  return STORAGE_KEY + ':' + userId;
}

let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;
let syncStatusResetTimer: ReturnType<typeof setTimeout> | null = null;

// AppState mixes real user data with pure UI state (current screen, open
// menus, tab selections, in-progress form fields). Only changes to these
// keys represent something worth saving to Supabase — navigating around the
// app must not flash 保存中…/保存済み or hit the network.
const PERSISTED_KEYS: ReadonlySet<keyof AppState> = new Set<keyof AppState>([
  'invTarget', 'cuts', 'habitsOff', 'gross', 'savingsGoal', 'spendGoal',
  'bonuses', 'budgetCategories', 'budgetActuals', 'transfersByMonth',
  'habits', 'subs', 'events', 'cashExpensesByMonth', 'cashRecurring',
]);

export const useAppStore = create<Store>((set, get) => {
  function setSyncStatus(v: SyncStatus) {
    set({ syncStatus: v });
    if (syncStatusResetTimer) { clearTimeout(syncStatusResetTimer); syncStatusResetTimer = null; }
    if (v === 'saved') syncStatusResetTimer = setTimeout(() => setSyncStatus('idle'), 2000);
  }

  function flushSync() {
    if (pendingSyncTimer) { clearTimeout(pendingSyncTimer); pendingSyncTimer = null; }
    const { session, state } = get();
    if (!session || !state) return;
    sb.from('user_state').upsert({ user_id: session.user.id, data: state, updated_at: new Date().toISOString() })
      .then((res) => {
        if (res.error) { console.error('状態の保存に失敗しました', res.error); setSyncStatus('error'); return; }
        setSyncStatus('saved');
      });
  }

  function scheduleSync() {
    const { session } = get();
    if (!session) return;
    setSyncStatus('pending');
    if (pendingSyncTimer) clearTimeout(pendingSyncTimer);
    pendingSyncTimer = setTimeout(flushSync, 800);
  }

  // Best-effort: if the tab is closed/navigated away while a sync is still
  // debouncing, flush immediately instead of losing the last ~800ms of edits.
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { if (pendingSyncTimer) flushSync(); });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && pendingSyncTimer) flushSync();
    });
  }

  function loadCardTransactions() {
    const { session } = get();
    if (!session) return;
    Promise.resolve(
      sb.from('card_transactions').select('statement_month,amount,category_id,merchant').eq('user_id', session.user.id),
    )
      .then((res) => {
        if (res.error) throw res.error;
        const byMonth: Record<string, Record<string, number>> = {};
        const subTxByMonth: Record<string, { name: string; cycle: string; byMonth: Record<string, number> }> = {};
        (res.data || []).forEach((r: any) => {
          const m = byMonth[r.statement_month] || (byMonth[r.statement_month] = {});
          m[r.category_id] = (m[r.category_id] || 0) + Number(r.amount);
          if (r.category_id === 'sub') {
            const c = canonicalSubName(r.merchant);
            const entry = subTxByMonth[c.id] || (subTxByMonth[c.id] = { name: c.name, cycle: c.cycle, byMonth: {} });
            entry.byMonth[r.statement_month] = (entry.byMonth[r.statement_month] || 0) + Number(r.amount);
          }
        });

        const derivedSubs = Object.keys(subTxByMonth).map((id) => {
          const entry = subTxByMonth[id];
          const months = Object.keys(entry.byMonth).sort();
          const latestMonth = months[months.length - 1];
          return { id, name: entry.name, price: Math.round(entry.byMonth[latestMonth]), cycle: entry.cycle as 'monthly' | 'annual' };
        });

        get().setState((st) => {
          const ba = { ...st.budgetActuals };
          Object.keys(byMonth).forEach((mk) => {
            // Fill in categories with no recorded value yet; never clobber an
            // existing value (e.g. one the user already typed into the budget
            // screen), or a manual edit would be silently reverted on every reload.
            const existing = ba[mk] || {};
            const merged = { ...existing };
            Object.keys(byMonth[mk]).forEach((catId) => {
              if (merged[catId] === undefined) merged[catId] = byMonth[mk][catId];
            });
            ba[mk] = merged;
          });

          // Real imported subscriptions replace the generic starter placeholders,
          // but keep whatever usage classification the user already set for a
          // subscription that's still present (matched by its stable id).
          let subs = st.subs;
          if (derivedSubs.length > 0) {
            const prevById: Record<string, any> = {};
            st.subs.forEach((s) => { prevById[s.id] = s; });
            subs = derivedSubs.map((d) => {
              const prev = prevById[d.id];
              return { id: d.id, name: d.name, price: d.price, cycle: d.cycle, usage: prev ? prev.usage : 'mid' } as any;
            });
          }

          return { budgetActuals: ba, subs, dbLoaded: true };
        });
      })
      .catch((e) => console.error('カード明細の取得に失敗しました', e));
  }

  return {
    session: null,
    state: null,
    authReady: false,
    syncStatus: 'idle',

    async bootstrap() {
      const res = await sb.auth.getSession();
      if (res.data.session) {
        await get().enterApp(res.data.session);
      } else {
        set({ authReady: true });
      }
    },

    async enterApp(session: Session) {
      set({ session });
      let cached: AppState | null = null;
      try { cached = JSON.parse(localStorage.getItem(userStorageKey(session.user.id)) || 'null'); } catch { /* no local cache */ }
      try {
        const res = await sb.from('user_state').select('data').eq('user_id', session.user.id).maybeSingle();
        if (res.error) throw res.error;
        const merged = Object.assign(defaultState(monthKey, isoDate), cached || {}, (res.data && (res.data as any).data) || {});
        set({ state: merged, authReady: true });
        loadCardTransactions();
      } catch (e) {
        // A failed read must never fall back to blank defaults here: the next
        // mutation would sync that empty state to Supabase and overwrite the
        // user's real saved data. Fall back to the last-known local cache instead.
        console.error('ユーザーデータの読み込みに失敗しました', e);
        const merged = Object.assign(defaultState(monthKey, isoDate), cached || {});
        set({ state: merged, authReady: true });
        loadCardTransactions();
      }
    },

    async signOut() {
      await sb.auth.signOut();
      window.location.reload();
    },

    setState(patch) {
      const { state, session } = get();
      if (!state) return;
      const next = typeof patch === 'function' ? patch(state) : patch;
      const merged = { ...state, ...next };
      set({ state: merged });
      if (session) {
        try { localStorage.setItem(userStorageKey(session.user.id), JSON.stringify(merged)); } catch { /* storage full/unavailable */ }
        // Sync only when a persisted key actually changed in value — not on
        // navigation/tab/form-typing patches, and not when a data key was
        // rewritten with identical content (e.g. the card-transaction merge
        // on reload producing fresh but equal objects).
        const dataChanged = Object.keys(next).some((k) =>
          PERSISTED_KEYS.has(k as keyof AppState) &&
          JSON.stringify(state[k as keyof AppState]) !== JSON.stringify(next[k as keyof AppState]),
        );
        if (dataChanged) scheduleSync();
      }
    },
  };
});
