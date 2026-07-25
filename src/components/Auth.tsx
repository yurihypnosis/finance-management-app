import { useState } from 'react';
import { sb } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

function translateAuthError(message: string): string {
  const rules: [RegExp, string][] = [
    [/invalid login credentials/i, 'メールアドレスまたはパスワードが正しくありません'],
    [/already registered|already exists/i, 'このメールアドレスはすでに登録されています'],
    [/password.*at least|password.*short|weak password/i, 'パスワードは6文字以上で入力してください'],
    [/invalid email|unable to validate email/i, 'メールアドレスの形式が正しくありません'],
    [/rate limit|too many requests/i, '試行回数が多すぎます。しばらく待ってから再度お試しください'],
    [/network/i, 'ネットワークエラーが発生しました。接続を確認してください'],
  ];
  for (const r of rules) if (r[0].test(message)) return r[1];
  return message;
}

export function Auth() {
  const enterApp = useAppStore((st) => st.enterApp);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  function submit() {
    if (!email.trim() || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    const call = isSignup
      ? sb.auth.signUp({ email: email.trim(), password })
      : sb.auth.signInWithPassword({ email: email.trim(), password });
    call.then((res) => {
      if (res.error) { setLoading(false); setError(translateAuthError(res.error.message)); return; }
      if (!res.data.session) { setLoading(false); setError('メールの確認が必要です。管理者に確認してください'); return; }
      setLoading(false);
      enterApp(res.data.session);
    });
  }

  return (
    <div style={{ padding: '72px 24px 40px 24px', maxWidth: '360px', margin: '0 auto' }}>
      <div className="topbar-title" style={{ textAlign: 'center', marginBottom: '8px' }}>KAKEIBO</div>
      <div className="screen-sub" style={{ textAlign: 'center', marginBottom: '28px' }}>{isSignup ? '新規登録' : 'ログイン'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span className="field-label">メールアドレス</span>
          <input
            className="field-input" type="email" value={email} autoComplete="email" autoFocus
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <span className="field-label">パスワード（6文字以上）</span>
          <input
            className="field-input" type="password" value={password} autoComplete={isSignup ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>
        {error && (
          <div style={{ fontSize: '12px', color: 'var(--red)', background: 'rgba(192,123,114,.1)', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        <div
          className="btn-primary" style={{ textAlign: 'center', opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer', marginTop: '4px' }}
          onClick={loading ? undefined : submit}
        >
          {loading ? '処理中…' : (isSignup ? '登録する' : 'ログイン')}
        </div>
        <div
          className="link-quiet" style={{ textAlign: 'center', margin: '4px auto 0 auto' }}
          onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}
        >
          {isSignup ? 'アカウントをお持ちの方はこちら' : 'はじめての方はこちら（新規登録）'}
        </div>
      </div>
    </div>
  );
}
