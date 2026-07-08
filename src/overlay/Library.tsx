import { useEffect, useState } from 'react';
import { useOverlayStore } from './store';
import { getEditorText } from '../content/editor';
import type { LibraryPrompt } from '../shared/types';
import type { AuthResponse, BgRequest, LibraryResponse } from '../shared/messages';

const send = <T,>(msg: BgRequest) => chrome.runtime.sendMessage(msg) as Promise<T>;

type Scope = 'personal' | 'public';
type View = 'list' | 'detail' | 'new';

export function LibraryView() {
  const { editor, applyText, account } = useOverlayStore();
  const [scope, setScope] = useState<Scope>('personal');
  const [view, setView] = useState<View>('list');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LibraryPrompt[]>([]);
  const [selected, setSelected] = useState<LibraryPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  const load = (s: Scope) => {
    setError(null);
    void send<LibraryResponse>({ type: s === 'personal' ? 'LIB_LIST' : 'PUBLIC_LIST' })
      .then((res) => (res.ok ? setItems(res.prompts) : setError(res.error)))
      .catch(() => setError('Could not reach the extension background.'));
  };

  useEffect(() => load(scope), [scope, account]);

  const filtered = query.trim()
    ? items.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.text.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  const saveCurrent = () => {
    const text = editor ? getEditorText(editor).trim() : '';
    if (!text) return;
    const title = text.split(/\s+/).slice(0, 6).join(' ');
    void send<LibraryResponse>({ type: 'LIB_SAVE', title, text }).then((res) => {
      if (res.ok) {
        setScope('personal');
        setItems(res.prompts);
      } else setError(res.error);
    });
  };

  const saveNew = () => {
    if (!newTitle.trim() || !newText.trim()) return;
    void send<LibraryResponse>({ type: 'LIB_SAVE', title: newTitle.trim(), text: newText }).then(
      (res) => {
        if (res.ok) {
          setItems(res.prompts);
          setNewTitle('');
          setNewText('');
          setScope('personal');
          setView('list');
        } else setError(res.error);
      },
    );
  };

  const remove = (id: string) => {
    void send<LibraryResponse>({ type: 'LIB_DELETE', id }).then((res) => {
      if (res.ok) {
        setItems(res.prompts);
        setView('list');
      } else setError(res.error);
    });
  };

  if (view === 'detail' && selected) {
    return (
      <div>
        <div className="pl-lib-title">
          {selected.category ? `${selected.category} · ` : ''}
          {selected.title}
        </div>
        <div className="pl-lib-text">{selected.text}</div>
        <div className="pl-actions">
          <button className="pl-dismiss" onClick={() => setView('list')}>
            ← Back
          </button>
          {scope === 'personal' && (
            <button className="pl-copy" onClick={() => remove(selected.id)}>
              Delete
            </button>
          )}
          <button
            className="pl-copy"
            onClick={() => void navigator.clipboard.writeText(selected.text).catch(() => {})}
          >
            Copy
          </button>
          <button className="pl-accept" onClick={() => void applyText(selected.text)}>
            ✓ Apply
          </button>
        </div>
      </div>
    );
  }

  if (view === 'new') {
    return (
      <div>
        <input
          className="pl-lib-search"
          placeholder="Prompt title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <textarea
          className="pl-refine-input pl-lib-new"
          placeholder="Write the prompt. Use {placeholders} for the parts to fill in each time."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <div className="pl-actions">
          <button className="pl-dismiss" onClick={() => setView('list')}>
            ← Back
          </button>
          <button className="pl-accept" onClick={saveNew}>
            Save prompt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-lib-bar">
        <div className="pl-tabs">
          <button
            className={`pl-tab${scope === 'personal' ? ' pl-tab-active' : ''}`}
            onClick={() => setScope('personal')}
          >
            Personal
          </button>
          <button
            className={`pl-tab${scope === 'public' ? ' pl-tab-active' : ''}`}
            onClick={() => setScope('public')}
          >
            Public
          </button>
        </div>
        <button className="pl-tab" onClick={() => setView('new')}>
          + New Prompt
        </button>
      </div>
      <input
        className="pl-lib-search"
        placeholder="Search library…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <div className="pl-error">{error}</div>}
      {filtered.map((p) => (
        <button
          key={p.id}
          className="pl-lib-row"
          onClick={() => {
            setSelected(p);
            setView('detail');
          }}
        >
          <b>{p.title}</b>
          <span>{p.text.slice(0, 90)}</span>
        </button>
      ))}
      {filtered.length === 0 && !error && (
        <div className="pl-empty-state">
          <b>No prompts found in your {scope === 'personal' ? 'Personal' : 'Public'} Library</b>
          <span>
            {scope === 'personal'
              ? 'Save your favorite prompts and they will appear here.'
              : 'Public prompts will appear here.'}
          </span>
          {scope === 'personal' && editor && getEditorText(editor).trim() && (
            <button className="pl-accept" onClick={saveCurrent}>
              Save current prompt
            </button>
          )}
        </div>
      )}
      {filtered.length > 0 && scope === 'personal' && editor && getEditorText(editor).trim() && (
        <div className="pl-actions">
          <button className="pl-copy" onClick={saveCurrent}>
            Save current prompt
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountView() {
  const { account, setAccount, setTab } = useOverlayStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const run = (type: 'AUTH_SIGNIN' | 'AUTH_SIGNUP') => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setNotice(null);
    void send<AuthResponse>({ type, email: email.trim(), password })
      .then((res) => {
        if (res.ok) {
          setAccount(res.email);
          if (res.info) setNotice(res.info);
          else setTab('library');
        } else setNotice(res.error);
      })
      .catch(() => setNotice('Could not reach the extension background.'))
      .finally(() => setBusy(false));
  };

  const signOut = () => {
    void send<AuthResponse>({ type: 'AUTH_SIGNOUT' }).then(() => setAccount(null));
  };

  if (account) {
    return (
      <div className="pl-empty-state">
        <b>{account}</b>
        <span>Signed in — your prompt library syncs to your Promptly account.</span>
        <button className="pl-copy" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-sec">Promptly account</div>
      <input
        className="pl-lib-search"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="pl-lib-search"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {notice && <div className="pl-note">{notice}</div>}
      <div className="pl-actions">
        <button className="pl-copy" disabled={busy} onClick={() => run('AUTH_SIGNUP')}>
          Create account
        </button>
        <button className="pl-accept" disabled={busy} onClick={() => run('AUTH_SIGNIN')}>
          Sign in
        </button>
      </div>
      <div className="pl-note">
        Sync your prompt library across devices. Without an account, prompts stay on this device.
      </div>
    </div>
  );
}
