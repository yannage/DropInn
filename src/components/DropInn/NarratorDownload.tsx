import { useEffect, useState, useSyncExternalStore } from 'react';
import { cancelNarratorDownload, downloadNarrator, narratorDownloadSnapshot, narratorSize, refreshNarratorDownload, removeNarratorDownload, subscribeNarratorDownload } from '../../lib/dropinn/narratorDownload';
import './narrator-download.css';

export function NarratorDownload({ compact = false }: { compact?: boolean }) {
  const pack = useSyncExternalStore(subscribeNarratorDownload, narratorDownloadSnapshot);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { void refreshNarratorDownload(); }, []);
  const busy = pack.status === 'downloading';
  const ready = pack.status === 'ready';
  return <div className={`di-narrator-download${compact ? ' is-compact' : ''}`}>
    <button type="button" className="di-text-button" aria-expanded={expanded} onClick={() => { setExpanded(!expanded); if (!expanded) void refreshNarratorDownload(); }}>
      {ready ? 'Narrator downloaded' : busy ? `Downloading narrator · ${Math.floor(pack.loaded / Math.max(1, pack.total) * 100)}%` : `Download narrator${pack.total ? ` · ${narratorSize(pack.total)}` : ''}`}
    </button>
    {expanded && <div className="di-narrator-download-details">
      <p>Bella can read this story aloud. One optional download works across every story. You can play immediately without it.</p>
      {pack.total > 0 && <p>{narratorSize(pack.total)} including the speech engine. {import.meta.env.DEV ? 'Development size estimate.' : 'Transfer may be smaller with compression.'}</p>}
      {busy && <><progress aria-label="Narrator download progress" value={pack.loaded} max={pack.total || 1} /><p role="status">{narratorSize(pack.loaded)} downloaded</p><button onClick={cancelNarratorDownload}>Cancel narrator download</button></>}
      {ready && <><p role="status">{pack.persistent ? 'Ready on this browser. Enable narration when you play.' : 'Ready for this visit. Your browser could not save the download.'}</p><button onClick={() => void removeNarratorDownload()}>Remove narrator download</button></>}
      {!busy && !ready && <button disabled={pack.status === 'checking'} onClick={() => void downloadNarrator().catch(() => {})}>{pack.status === 'error' ? 'Retry narrator download' : 'Download Bella narrator'}</button>}
      {pack.error && <p role="status">{pack.error}</p>}
    </div>}
  </div>;
}
