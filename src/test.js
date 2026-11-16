// Scénario de vérification demandé, joué dans un vrai navigateur (format iPhone).
const { chromium, devices } = require('playwright');
const assert = require('assert');
const shots = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await ctx.route('https://olnqyuzogijgykztopgs.supabase.co/**', async r => { const q = r.request(); const u = q.url().replace('https://olnqyuzogijgykztopgs.supabase.co', 'http://localhost:8766'); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } }); const h = q.headers(); const x = await fetch(u, { method: q.method(), headers: { apikey: h.apikey, authorization: h.authorization || '', 'content-type': 'application/json' }, body: q.postData() || undefined }); r.fulfill({ status: x.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: await x.text() }); });
  await p.goto('http://localhost:8765/index.html');
  assert.equal(await p.locator('#gate').isVisible(), true); assert.equal((await p.locator('#view').innerText()).trim(), ''); console.log('OK écran de connexion affiché en premier, aucune donnée derrière');
  await p.fill('#sy-email', 'doc@test.dz'); await p.fill('#sy-pass', 'secret'); await p.click('#gate-btn'); await p.waitForSelector('#gate', { state: 'hidden' });
  await p.waitForSelector('#ob-profil'); await p.selectOption('#ob-profil', 'dentaire'); await p.fill('#ob-nom', 'Cabinet Test'); await p.click('[data-act=saveOnboard]'); console.log('OK accueil : activité choisie, catalogue de départ créé');
  const T = s => p.locator(s).innerText().then(t => t.replace(/ /g, ' ').replace(/\s+/g, ' '));
  const nav = async t => { await p.click('[data-tab=' + t + ']'); await p.waitForSelector('.tabs a[data-tab=' + t + '][aria-current]'); await p.waitForFunction(t => document.querySelector('#view h1').textContent.toLowerCase().startsWith(t.slice(0, 6)), t); };
  const log = (...a) => console.log('OK', ...a);

  // 1. Première utilisation : tout à zéro
  let k = await T('.kpis'); assert(/0 DA 0 facture.*0 DA 0 facture/.test(k), k); log('démarrage à zéro :', k);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  // 2. Facture : consultation 1 500 + 2 détartrages 3 500
  await p.click('[data-act=newInvoice]');
  const num = await p.inputValue('#ed-numero'); log('numéro proposé', num, 'date', await p.inputValue('#ed-date'));
  await p.selectOption('#ln-svc-0', { label: 'Consultation — 1 500 DA' });
  assert.equal(await p.inputValue('#ln-prix-0'), '1500');
  await p.click('[data-act=addLine]');
  await p.selectOption('#ln-svc-1', { label: 'Détartrage — 3 500 DA' });
  await p.click('[data-act=qty][data-id="1"][data-d="1"]');
  assert.equal(await T('#ln-sub-1'), '7 000 DA');
  assert.equal(await T('#ed-total'), '8 500 DA'); log('total éditeur 8 500 DA');
  if (shots) await p.screenshot({ path: shots + '/editeur.png' });
  await p.click('#ed-save');
  log('confirmation :', await T('#toast'));
  k = await T('.kpis'); assert(/8 500 DA 1 facture.*8 500 DA 1 facture/.test(k), k); log('tableau de bord :', k);
  if (shots) await p.screenshot({ path: shots + '/tableau.png', fullPage: true });

  // 3. Registre + impression de la liste
  await nav('factures');
  const reg = await T('#view'); assert(/1 facture/.test(reg) && /8 500 DA/.test(reg)); log('registre écran :', reg.slice(0, 120));
  { const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=exportCsv]')]); const csv = require('fs').readFileSync(await dl.path(), 'utf8'); assert(/"F-2026-0001";"16\/11\/2026";"";"Consultation, Détartrage ×2";8500;8500;0;"Espèces"/.test(csv), csv); log('export Excel :', dl.suggestedFilename()); }
  await p.click('[data-act=printList]');
  assert.equal(await p.evaluate(() => window.__printed), 1);
  const paper = await T('#paper'); assert(/Journée du/.test(paper) && /1 facture/.test(paper));
  assert.equal(await T('#paper [data-total]'), '8 500 DA'); log('registre imprimé :', paper);
  await p.emulateMedia({ media: 'print' });
  const vis = await p.evaluate(() => [...document.body.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.tagName));
  assert.deepEqual(vis, ['apercu']); assert.equal(await p.locator('#apercu .sheet-head').isVisible(), false); log('impression : menus et boutons masqués');
  if (shots) await p.pdf({ path: shots + '/registre.pdf', format: 'A4' });
  await p.emulateMedia({ media: 'screen' });
  await p.click('[data-act=closeApercu]');

  // Facture individuelle imprimée
  await p.click('button.item[data-act=openInvoice]');
  await p.click('[data-act=printInvoice]');
  assert.equal(await T('#paper [data-total]'), '8 500 DA'); log('facture imprimée :', await T('#paper'));
  await p.emulateMedia({ media: 'print' }); if (shots) await p.pdf({ path: shots + '/facture.pdf', format: 'A4' }); await p.emulateMedia({ media: 'screen' });
  await p.click('[data-act=closeApercu]');

  // 4. Détartrage passe à 4 000 au catalogue
  await nav('prestations');
  await p.click('button.item:has-text("Détartrage")');
  await p.fill('#svc-prix', '4000'); await p.click('[data-act=saveService]');
  await nav('factures');
  assert(/8 500 DA/.test(await T('#view'))); log('facture existante inchangée : 8 500 DA');
  // Rouvrir sans doublon et sans changement de prix
  await p.click('button.item[data-act=openInvoice]'); await p.click('[data-act=editInvoice]');
  assert.equal(await p.inputValue('#ed-numero'), num); assert.equal(await p.inputValue('#ln-prix-1'), '3500'); assert.equal(await T('#ed-total'), '8 500 DA');
  await p.click('#ed-save');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('carnet-dentaire-v1')).invoices.length), 1); log('correction sans doublon, prix facturé conservé (3 500)');
  // Nouvelle facture : 4 000 proposé
  await nav('tableau'); await p.click('[data-act=newInvoice]');
  const num2 = await p.inputValue('#ed-numero'); assert.notEqual(num2, num);
  await p.selectOption('#ln-svc-0', { label: 'Détartrage — 4 000 DA' });
  assert.equal(await p.inputValue('#ln-prix-0'), '4000'); log('nouvelle facture', num2, ': détartrage proposé à 4 000');
  // Prix modifié sur une seule facture, sans toucher au catalogue
  await p.fill('#ln-prix-0', '3000'); assert.equal(await T('#ed-total'), '3 000 DA');
  await p.click('[data-act=closeEditor]');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('carnet-dentaire-v1')).services.find(s => s.nom === 'Détartrage').prix), 4000);

  // Règlement : impayée puis payée
  await nav('factures'); await p.click('button.item[data-act=openInvoice]'); await p.click('[data-act=editInvoice]');
  await p.selectOption('#ed-statut', 'partiel'); await p.fill('#ed-recu', '5000'); await p.click('#ed-save'); await nav('tableau');
  k = await T('.kpis'); assert(/8 500 DA 1 facture Encaissé 5 000 DA · reste 3 500 DA/.test(k), k); assert(/Restes à payer 3 500 DA/.test(await T('#dus'))); log('paiement partiel :', k);
  await p.click('#dus [data-act=openInvoice]'); await p.click('[data-act=printInvoice]'); assert(/Reçu : 5 000 DA \(espèces\) · Reste à payer : 3 500 DA/.test(await T('#paper'))); await p.click('[data-act=closeApercu]');
  await p.click('#dus [data-act=openInvoice]'); await p.click('[data-act=markPaid]'); assert.equal(await p.locator('#dus').count(), 0); log('marquée payée : plus de reste');

  // 5. Persistance après rechargement, démonstration hors totaux
  await p.reload();
  k = await T('.kpis'); assert(/8 500 DA 1 facture/.test(k)); log('données conservées après rechargement');
  assert.equal(await p.locator('[data-act=startDemo]').count(), 0);

  // Sauvegarde / restauration
  await nav('prestations');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=exportData]')]);
  const f = await dl.path(); log('export :', dl.suggestedFilename());
  await nav('factures'); await p.click('button.item[data-act=openInvoice]'); await p.click('[data-act=deleteInvoice]'); await p.click('#confirm-ok');
  await nav('tableau'); assert(/0 DA 0 facture/.test(await T('.kpis')));
  await nav('prestations');
  await p.setInputFiles('#restore-file', { name: 'sauvegarde.json', mimeType: 'application/json', buffer: require('fs').readFileSync(f) });
  await p.click('#confirm-ok'); await nav('tableau');
  k = await T('.kpis'); assert(/8 500 DA 1 facture/.test(k)); log('restauration :', k);

  // Déconnexion : données retirées de l'appareil, retrouvées à la reconnexion
  await p.waitForFunction(() => document.querySelector('#sync-dot').textContent === 'Synchronisé');
  await nav('prestations'); await p.click('[data-act=signOut]'); await p.click('#confirm-ok'); await p.waitForSelector('#gate');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('carnet-dentaire-v1')).invoices.length), 0); log('déconnexion : appareil vidé');
  await p.fill('#sy-email', 'doc@test.dz'); await p.fill('#sy-pass', 'secret'); await p.click('#gate-btn'); await p.waitForFunction(() => document.querySelector('#sync-dot').textContent === 'Synchronisé');
  k = await T('.kpis'); assert(/8 500 DA 1 facture/.test(k), k); log('reconnexion : données retrouvées', k);
  assert.deepEqual(errs, []); log('aucune erreur console');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
