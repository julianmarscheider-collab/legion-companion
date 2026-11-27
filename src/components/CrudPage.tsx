import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Repository } from '../data/repositories';
import { useCollection } from '../data/useCollection';
import type { Entity } from '../domain/types';

type Named = Entity & { name: string };

export interface EditorProps<T> {
  value: T;
  onChange(value: T): void;
}

/** Generic "browse + create + edit" page used by every generator. */
export function CrudPage<T extends Named>(p: {
  title: string;
  intro: string;
  repo: Repository<T>;
  create(ownerId: string): T;
  summary(item: T): ReactNode;
  Editor(props: EditorProps<T>): ReactNode;
  newLabel?: string;
  /** Extra buttons next to "+ New", e.g. an import. */
  actions?: ReactNode;
  /** Optional filter buttons, e.g. by faction; several rows allowed. Items with an empty group fall under `emptyLabel`. */
  groups?: GroupDef<T> | GroupDef<T>[];
}) {
  const { user } = useAuth();
  const items = useCollection(p.repo);
  const [draft, setDraft] = useState<T | null>(null);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const groupDefs = p.groups ? (Array.isArray(p.groups) ? p.groups : [p.groups]) : [];
  const [groupSel, setGroupSel] = useState<(string | null)[]>([]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) &&
          groupDefs.every((g, k) => groupSel[k] == null || g.get(i).trim() === groupSel[k]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, query, groupSel],
  );
  const isNew = draft && !items.some((i) => i.id === draft.id);

  const select = (item: T | null) => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    setDraft(item && structuredClone(item));
    setDirty(false);
  };
  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return alert('Please give it a name.');
    await p.repo.put(draft);
    setDirty(false);
  };
  const remove = async () => {
    if (!draft || !confirm(`Delete "${draft.name || 'this item'}"?`)) return;
    if (!isNew) await p.repo.delete(draft.id);
    setDraft(null);
    setDirty(false);
  };

  return (
    <div className={`crud ${draft ? 'editing' : ''}`}>
      <section className="crud-list">
        <header className="row between">
          <h1>{p.title}</h1>
          <div className="row gap">
            {p.actions}
            <button className="primary" onClick={() => select(p.create(user!.id))}>
              {p.newLabel ?? '+ New'}
            </button>
          </div>
        </header>
        <p className="muted">{p.intro}</p>
        {groupDefs.map((g, k) => (
          <GroupChips
            key={g.label}
            // Each row counts only the items that pass the other rows' filters.
            items={items.filter((i) => groupDefs.every((o, j) => j === k || groupSel[j] == null || o.get(i).trim() === groupSel[j]))}
            groups={g}
            value={groupSel[k] ?? null}
            onChange={(v) => setGroupSel((sel) => Object.assign([...sel], { [k]: v }))}
          />
        ))}
        {/* Search only helps once a list gets longer. */}
        {items.length >= 5 && (
          <input className="search" type="search" aria-label={`Search ${p.title.toLowerCase()}`} placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        <ul className="list">
          {filtered.map((item) => (
            <li key={item.id}>
              <button className={`list-item ${draft?.id === item.id ? 'active' : ''}`} onClick={() => select(item)}>
                {p.summary(item)}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="muted">Nothing here yet.</li>}
          {items.length > 0 && filtered.length === 0 && <li className="muted">No matches.</li>}
        </ul>
      </section>

      {draft && (
        <section className="crud-editor card">
          <header className="row between">
            <button className="ghost back" onClick={() => select(null)}>
              ← Back
            </button>
            <span className="muted">{isNew ? 'New' : dirty ? 'Unsaved changes' : 'Saved'}</span>
          </header>
          <p.Editor
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setDirty(true);
            }}
          />
          <footer className="row gap">
            <button className="primary" onClick={save} disabled={!dirty && !isNew}>
              Save
            </button>
            <button className="danger" onClick={remove}>
              Delete
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

interface GroupDef<T> {
  label: string;
  get(item: T): string;
  emptyLabel: string;
}

function GroupChips<T>(p: {
  items: T[];
  groups: { label: string; get(item: T): string; emptyLabel: string };
  value: string | null;
  onChange(v: string | null): void;
}) {
  const counts = new Map<string, number>();
  for (const i of p.items) {
    const g = p.groups.get(i).trim();
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const names = [...counts.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  if (names.length < 2 && p.value === null) return null; // nothing to filter yet
  return (
    <div className="chips" role="group" aria-label={`Filter by ${p.groups.label}`}>
      <button className={p.value === null ? 'chip active' : 'chip'} onClick={() => p.onChange(null)}>
        All {p.groups.label}s <span className="muted">{p.items.length}</span>
      </button>
      {names.map((g) => (
        <button key={g} className={p.value === g ? 'chip active' : 'chip'} onClick={() => p.onChange(p.value === g ? null : g)}>
          {g || p.groups.emptyLabel} <span className="muted">{counts.get(g)}</span>
        </button>
      ))}
    </div>
  );
}
