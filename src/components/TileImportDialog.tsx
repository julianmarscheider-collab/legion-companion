import { useEffect, useMemo, useRef, useState } from 'react';
import { newEntity, repos } from '../data/repositories';
import type { MapTile } from '../domain/types';
import { naturalCompare, planImport, type CodeStyle } from '../domain/tileImport';
import { compressImage } from '../platform/camera';
import { TextField } from './fields';

/** Browsers that can pick a whole folder (desktop Chrome, Edge, Firefox, Safari). */
const canPickFolder = typeof document !== 'undefined' && 'webkitdirectory' in document.createElement('input');

/**
 * Import a folder of images as map tiles: one tile per image, named after the file,
 * with automatic codes (numbers or letters) that continue after the existing tiles.
 */
export function TileImportDialog({ ownerId, tiles, onClose }: { ownerId: string; tiles: MapTile[]; onClose(): void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [style, setStyle] = useState<CodeStyle>('numbers');
  const [collection, setCollection] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const folderInput = useRef<HTMLInputElement>(null);

  // React has no prop for folder picking; set the attribute directly.
  useEffect(() => folderInput.current?.setAttribute('webkitdirectory', ''), []);

  const choose = (list: FileList | null) => {
    const images = [...(list ?? [])].filter((f) => f.type.startsWith('image/')).sort((a, b) => naturalCompare(a.name, b.name));
    setError(list?.length && !images.length ? 'No images found in that selection.' : '');
    setFiles(images);
    // Use the folder name as the collection, unless one was typed already.
    const folder = images[0]?.webkitRelativePath.split('/')[0];
    if (folder && !collection) setCollection(folder);
  };

  // Tiles created by this import must not count as "existing": they would clash with themselves
  // and shift the automatic codes while the import runs.
  const importedIds = useRef(new Set<string>());
  const existing = tiles.filter((t) => !importedIds.current.has(t.id));
  const existingCodes = existing.map((t) => t.code.trim());
  const plan = useMemo(() => planImport(files.map((f) => f.name), style, existingCodes), [style, files, tiles]); // eslint-disable-line react-hooks/exhaustive-deps
  const fromName = style === 'prefix' || style === 'suffix';
  const missing = plan.filter((p) => !p.code).length;
  // Codes used twice within this import, and codes an existing tile already has.
  const twice = [...new Set(plan.map((p) => p.code).filter((c, i, all) => c && all.indexOf(c) !== i))];
  const takenBy = new Map(plan.flatMap((p) => existing.filter((t) => p.code && t.code.trim() === p.code).map((t) => [p.code, t] as const)));
  const clash = (code: string) => twice.includes(code) || takenBy.has(code);
  const collections = [...new Set(tiles.map((t) => (t.collection ?? '').trim()).filter(Boolean))].sort();

  const run = async () => {
    setProgress(0);
    try {
      const base = newEntity(ownerId);
      for (const [i, file] of files.entries()) {
        const tile: MapTile = {
          ...newEntity(ownerId),
          // Keep the folder order in the list (which is sorted by creation time).
          createdAt: base.createdAt + i,
          name: plan[i].name,
          code: plan[i].code,
          collection: collection.trim(),
          isStart: false,
          description: '',
          photos: [await compressImage(file)],
          markers: [],
          rules: '',
        };
        importedIds.current.add(tile.id);
        await repos.mapTiles.put(tile);
        setProgress(i + 1);
      }
      onClose();
    } catch {
      setError('Some images could not be read. The tiles before them were imported.');
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal card tile-import" role="dialog" aria-label="Import tiles from images" onClick={(e) => e.stopPropagation()}>
        <h2>Import tiles from images</h2>
        <p className="muted">Each image becomes a map tile, named after its file. You can add markers and rules afterwards.</p>
        <div className="row gap wrap">
          {canPickFolder && (
            <label className="button">
              Choose folder…
              <input ref={folderInput} type="file" multiple hidden onChange={(e) => choose(e.target.files)} disabled={busy} />
            </label>
          )}
          <label className="button">
            {canPickFolder ? 'Choose images…' : 'Choose images'}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => choose(e.target.files)} disabled={busy} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <TextField
          label="Collection for all imported tiles"
          help="tileCollection"
          value={collection}
          onChange={setCollection}
          suggestions={collections}
          placeholder={canPickFolder ? 'Optional – the folder name is used if left empty' : 'Optional'}
        />
        {files.length > 0 && (
          <>
            <fieldset className="code-style">
              <legend>Tile codes</legend>
              <label>
                <input type="radio" name="code-style" checked={style === 'numbers'} onChange={() => setStyle('numbers')} disabled={busy} /> Numbers (1, 2, 3…)
              </label>
              <label>
                <input type="radio" name="code-style" checked={style === 'letters'} onChange={() => setStyle('letters')} disabled={busy} /> Letters (A, B, C…)
              </label>
              <label>
                <input type="radio" name="code-style" checked={style === 'prefix'} onChange={() => setStyle('prefix')} disabled={busy} /> From the start of the name (A_street)
              </label>
              <label>
                <input type="radio" name="code-style" checked={style === 'suffix'} onChange={() => setStyle('suffix')} disabled={busy} /> From the end of the name (street_A)
              </label>
              {!fromName && tiles.length > 0 && <small className="muted">Codes continue after your existing tiles.</small>}
              {fromName && <small className="muted">The code is the first or last part of the file name, separated by _, - or a space.</small>}
            </fieldset>
            <ol className="import-preview" aria-label="Tiles to import">
              {files.map((f, i) => (
                <li key={f.name + i}>
                  <b className={!plan[i].code || clash(plan[i].code) ? 'no-code' : ''}>{plan[i].code || '?'}</b> {plan[i].name}
                </li>
              ))}
            </ol>
            {missing > 0 && (
              <p className="warning">
                ⚠ {missing === 1 ? '1 file has' : `${missing} files have`} no code in the name (marked ?). {missing === 1 ? 'Its' : 'Their'} code stays empty; you can add it in the tile editor.
              </p>
            )}
            {!busy && twice.length > 0 && (
              <p className="warning">
                ⚠ {twice.length === 1 ? `Code ${twice[0]} appears` : `Codes ${twice.join(', ')} appear`} more than once in these files.
              </p>
            )}
            {!busy && takenBy.size > 0 && (
              <p className="warning">
                ⚠ Already used by your tiles:{' '}
                {[...takenBy.values()].map((t) => `${t.code} (${t.name}${t.collection ? `, ${t.collection}` : ''})`).join('; ')}.
              </p>
            )}
            {!busy && (twice.length > 0 || takenBy.size > 0) && (
              <p className="muted small">The tiles can still be imported, but instructions like “tile {twice[0] ?? [...takenBy.keys()][0]}” would be unclear.</p>
            )}
          </>
        )}
        <div className="row gap wrap">
          <button className="primary" disabled={!files.length || busy} onClick={run}>
            {busy ? `Importing ${progress} / ${files.length}…` : files.length ? `Import ${files.length} ${files.length === 1 ? 'tile' : 'tiles'}` : 'Import'}
          </button>
          <button className="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
