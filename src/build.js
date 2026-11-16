// Assemble index.html (version autonome) à partir de src/app.html, et génère l'icône.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const body = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8')
  .replace(/^<title>.*<\/title>\n/, '').replace(/^<meta name="claude:[^\n]*\n/, '');
const head = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Carnet de cabinet</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Carnet">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131c2e" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="apple-touch-icon.png">
</head>
<body>
`;
const d = new Date(), build = d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
fs.writeFileSync(path.join(root, 'index.html'), (head + body + '</body>\n</html>\n').replace('__BUILD__', build));
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ build }) + '\n');

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 180, height: 180 } });
  await p.setContent(`<body style="margin:0"><svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <rect width="180" height="180" fill="#1d5fd6"/>
    <rect x="46" y="34" width="88" height="112" rx="10" fill="#fff"/>
    <rect x="60" y="56" width="60" height="8" rx="4" fill="#1d5fd6"/>
    <rect x="60" y="76" width="60" height="8" rx="4" fill="#9dbdf3"/>
    <rect x="60" y="96" width="38" height="8" rx="4" fill="#9dbdf3"/>
    <rect x="86" y="118" width="34" height="12" rx="6" fill="#1d5fd6"/></svg></body>`);
  await p.screenshot({ path: path.join(root, 'apple-touch-icon.png') });
  await b.close();
})();
