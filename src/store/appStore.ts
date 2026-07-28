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
  'habits', 'subs', 'deletedSubIds', 'events', 'cashExpensesByMonth', 'cashRecurring',
]);

/** 保存対象キーだけを抜き出す。UI状態（screen・viewMonth・開いているシート・入力途中の
    フォーム値）まで保存/復元すると、翌月に先月表示のまま開いたり、前回の入力値が
    次のフォームに残ったりするため、データだけを永続化する。 */
function pickPersisted(src: Partial<AppState> | null | undefined): Partial<AppState> {
  const out: Partial<AppState> = {};
  if (!src) return out;
  PERSISTED_KEYS.forEach((k) => {
    if (src[k] !== undefined) (out as Record<string, unknown>)[k] = src[k];
  });
  return out;
}

/** localStorage キャッシュ。新形式は { savedAt, data }、旧形式は AppState 丸ごと。 */
function parseCache(raw: string | null): { savedAt: string | null; data: Partial<AppState> } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && p.data && typeof p.savedAt === 'string') return { savedAt: p.savedAt, data: p.data };
    if (p && typeof p === 'object') return { savedAt: null, data: p };
  } catch { /* 壊れたキャッシュは無視 */ }
  return null;
}

function isNewer(a: string | null, b: string | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

export const useAppStore = create<Store>((set, get) => {
  function setSyncStatus(v: SyncStatus) {
    set({ syncStatus: v });
    if (syncStatusResetTimer) { clearTimeout(syncStatusResetTimer); syncStatusResetTimer = null; }
    if (v === 'saved') syncStatusResetTimer = setTimeout(() => setSyncStatus('idle'), 2000);
  }

  // 送信の直列化: 先行リクエストの完了前に新しい編集が来たら dirty を立て、完了後に
  // 最新状態で送り直す。並行 upsert が逆順で着弾して古い状態が DB に残るのを防ぐ。
  let syncInFlight = false;
  let syncDirty = false;
  let syncRetries = 0;

  function flushSync() {
    if (pendingSyncTimer) { clearTimeout(pendingSyncTimer); pendingSyncTimer = null; }
    const { session, state } = get();
    if (!session || !state) return;
    if (syncInFlight) { syncDirty = true; return; }
    syncInFlight = true;
    const fail = (err: unknown) => {
      syncInFlight = false;
      console.error('状態の保存に失敗しました', err);
      if (syncRetries < 3) {
        syncRetries += 1;
        setSyncStatus('pending');
        pendingSyncTimer = setTimeout(flushSync, 3000 * syncRetries);
      } else {
        setSyncStatus('error');
      }
    };
    sb.from('user_state').upsert({ user_id: session.user.id, data: pickPersisted(state), updated_at: new Date().toISOString() })
      .then((res) => {
        if (res.error) { fail(res.error); return; }
        syncInFlight = false;
        syncRetries = 0;
        if (syncDirty) { syncDirty = false; flushSync(); return; }
        setSyncStatus('saved');
      }, fail);
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
          // but keep whatever the user already set for a subscription that's
          // still present (matched by its stable id): usage classification and
          // cancellation state must survive a reload.
          let subs = st.subs;
          if (derivedSubs.length > 0) {
            const prevById: Record<string, any> = {};
            st.subs.forEach((s) => { prevById[s.id] = s; });
            const deleted = new Set(st.deletedSubIds || []);
            subs = derivedSubs
              .filter((d) => !deleted.has(d.id))
              .map((d) => {
                const prev = prevById[d.id];
                return { id: d.id, name: d.name, price: d.price, cycle: d.cycle, usage: prev ? prev.usage : 'mid', cancelledMonth: prev?.cancelledMonth } as any;
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
      try {
        const res = await sb.auth.getSession();
        if (res.data.session) {
          await get().enterApp(res.data.session);
        } else {
          set({ authReady: true });
        }
      } catch (e) {
        // セッション取得に失敗してもローディング画面で固まらせない
        console.error('セッションの取得に失敗しました', e);
        set({ authReady: true });
      }
    },

    async enterApp(session: Session) {
      set({ session });
      const cached = parseCache(localStorage.getItem(userStorageKey(session.user.id)));
      try {
        const res = await sb.from('user_state').select('data, updated_at').eq('user_id', session.user.id).maybeSingle();
        if (res.error) throw res.error;
        const remote = res.data as { data?: Partial<AppState>; updated_at?: string } | null;
        // 新しい方を勝たせる: 保存失敗やタブを閉じた直後などでローカルキャッシュの方が
        // 新しいことがあり、常にリモート優先だとその編集が古いデータで巻き戻される。
        // 旧形式キャッシュ（時刻なし）は従来どおりリモート優先。
        const cacheNewer = !!cached && isNewer(cached.savedAt, remote?.updated_at || null);
        const layers = cacheNewer
          ? [pickPersisted(remote?.data), pickPersisted(cached?.data)]
          : [pickPersisted(cached?.data), pickPersisted(remote?.data)];
        const merged = Object.assign(defaultState(monthKey, isoDate), ...layers);
        set({ state: merged, authReady: true });
        if (cacheNewer) scheduleSync();
        loadCardTransactions();
      } catch (e) {
        // A failed read must never fall back to blank defaults here: the next
        // mutation would sync that empty state to Supabase and overwrite the
        // user's real saved data. Fall back to the last-known local cache instead.
        console.error('ユーザーデータの読み込みに失敗しました', e);
        const merged = Object.assign(defaultState(monthKey, isoDate), pickPersisted(cached?.data));
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
        // Sync only when a persisted key actually changed in value — not on
        // navigation/tab/form-typing patches, and not when a data key was
        // rewritten with identical content (e.g. the card-transaction merge
        // on reload producing fresh but equal objects).
        const dataChanged = Object.keys(next).some((k) =>
          PERSISTED_KEYS.has(k as keyof AppState) &&
          JSON.stringify(state[k as keyof AppState]) !== JSON.stringify(next[k as keyof AppState]),
        );
        if (dataChanged) {
          // データキーのみ・保存時刻つきでキャッシュ（リロード時の新旧比較に使う）
          try {
            localStorage.setItem(userStorageKey(session.user.id), JSON.stringify({ savedAt: new Date().toISOString(), data: pickPersisted(merged) }));
          } catch { /* storage full/unavailable */ }
          scheduleSync();
        }
      }
    },
  };
});
