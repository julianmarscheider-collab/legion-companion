import { useEffect, useState } from 'react';

/** Copyright notices and license texts of the fonts and libraries shipped in the app. */
export function LicensesPage() {
  const [text, setText] = useState('Loading…');
  useEffect(() => {
    fetch('./licenses.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then(setText)
      .catch(() => setText('Could not load the license file.'));
  }, []);
  return (
    <div className="page narrow licenses">
      <h1>Licenses</h1>
      <p className="muted">
        Legion Companion uses these open-source libraries and fonts. Fonts: Cinzel (headings) and EB Garamond (text), both
        under the SIL Open Font License 1.1.
      </p>
      <pre className="card">{text}</pre>
    </div>
  );
}
