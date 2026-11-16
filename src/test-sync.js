// Deux appareils simulés (A et B) synchronisés via le faux serveur.
const { chromium, devices } = require('playwright'); const assert = require('assert');
(async () => {
  const b = await chromium.launch(); const errs = []; const off = new Set();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' }); await c.route('https://olnqyuzogijgykztopgs.supabase.co/**', async r => { const q = r.request(); const u = q.url().replace('https://olnqyuzogijgykztopgs.supabase.co', 'http://localhost:8766'); if (off.has(c)) return r.abort(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } }); const h = q.headers(); const x = await fetch(u, { method: q.method(), headers: { apikey: h.apikey, authorization: h.authorization || '', 'content-type': 'application/json' }, body: q.postData() || undefined }); r.fulfill({ status: x.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: await x.text() }); }); const p = await c.newPage(); p.ctx = c; p.on('pageerror', e => errs.push(String(e))); await p.goto('http://localhost:8765/index.html'); return p; };
  const T = (p, s) => p.locator(s).innerText().then(t => t.replace(/ /g, ' ').replace(/\s+/g, ' '));
  const nav = async (p, t) => { await p.click('[data-tab=' + t + ']'); await p.waitForFunction(t => document.querySelector('#view h1').textContent.toLowerCase().startsWith(t.slice(0, 6)), t); };
  const synced = p => p.waitForFunction(() => document.querySelector('#sync-dot').textContent === 'Synchronisé');
  const login = async (p, pw) => { await p.fill('#sy-email', 'doc@test.dz'); await p.fill('#sy-pass', pw || 'secret'); await p.click('#gate-btn'); if (!pw) await synced(p); };
  const syncNow = async p => { await nav(p, 'prestations'); await p.click('[data-act=syncNow]'); await p.waitForTimeout(600); await synced(p); };
  const invoice = async (p, label) => { await nav(p, 'tableau'); await p.click('[data-act=newInvoice]'); await p.selectOption('#ln-svc-0', { label }); await p.click('#ed-save'); };
  const log = (...a) => console.log('OK', ...a);

  const A = await mk();
  await login(A, 'faux'); await A.waitForSelector('#sy-err:not([hidden])'); log('mauvais mot de passe :', await T(A, '#sy-err'));
  await login(A); await invoice(A, 'Consultation — 1 500 DA'); await A.waitForTimeout(1500); await synced(A); log('A connecté, facture envoyée');

  const B = await mk(); await login(B); await nav(B, 'tableau');
  let k = await T(B, '.kpis'); assert(/1 500 DA 1 facture/.test(k), k); log('B reçoit la facture de A :', k);

  await nav(B, 'prestations'); await B.click('button.item:has-text("Détartrage")'); await B.fill('#svc-prix', '4000'); await B.click('[data-act=saveService]'); await B.waitForTimeout(1500); await synced(B);
  await syncNow(A); assert(/Détartrage.*4 000 DA/.test(await T(A, '#view'))); log('A reçoit le tarif modifié sur B (4 000)');
  await nav(A, 'tableau'); assert(/1 500 DA 1 facture/.test(await T(A, '.kpis'))); 

  // B hors connexion : saisie conservée puis envoyée au retour du réseau
  off.add(B.ctx);
  await invoice(B, 'Détartrage — 4 000 DA'); await B.waitForTimeout(2000);
  assert(/En attente/.test(await T(B, '#sync-dot'))); log('B hors connexion :', await T(B, '#sync-dot'));
  // A crée en même temps une facture : même numéro des deux côtés
  await invoice(A, 'Radiographie — 1 000 DA'); await A.waitForTimeout(1500); await synced(A);
  off.delete(B.ctx); await syncNow(B); await syncNow(A); await nav(A, 'tableau');
  k = await T(A, '.kpis'); assert(/6 500 DA 3 factures/.test(k), k); log('après retour réseau, A :', k);
  await nav(B, 'tableau'); k = await T(B, '.kpis'); assert(/6 500 DA 3 factures/.test(k), k);
  assert(/Numéro en double/.test(await T(B, '#banners'))); log('doublon de numéro signalé :', (await T(B, '#banners')).slice(0, 90));

  // Suppression propagée
  await A.click('button[data-act=openInvoice] >> nth=0'); await A.click('[data-act=deleteInvoice]'); await A.click('#confirm-ok'); await A.waitForTimeout(1500); await synced(A);
  await syncNow(B); await nav(B, 'tableau'); k = await T(B, '.kpis'); assert(/2 factures/.test(k), k); log('suppression sur A propagée à B :', k);
  // Rechargement : session conservée
  await B.reload(); await synced(B); log('session conservée après rechargement');
  assert.deepEqual(errs, []); log('aucune erreur'); await b.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
