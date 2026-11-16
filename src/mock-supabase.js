// Faux serveur Supabase (auth + table carnet_items) pour tester en local.
const http = require('http');
const KEY = 'sb_publishable_KtecPpudCqwzvDItFGc58g_ITkQdoQ_';
const users = new Map([['doc@test.dz', { id: 'u1', password: 'secret' }]]);
const rows = new Map(), journal = []; let n = 0;
const send = (res, code, body) => { res.writeHead(code, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' }); res.end(body == null ? '' : JSON.stringify(body)); };
const session = (email, u) => ({ access_token: 'jwt-' + u.id, refresh_token: 'r-' + u.id, expires_in: 3600, user: { id: u.id, email } });
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const u = new URL(req.url, 'http://x'), body = b ? JSON.parse(b) : null;
    if (req.headers.apikey !== KEY) return send(res, 401, { message: 'Invalid API key' });
    if (u.pathname === '/auth/v1/signup') {
      if (users.has(body.email)) return send(res, 422, { msg: 'User already registered' });
      const nu = { id: 'u' + (users.size + 1), password: body.password }; users.set(body.email, nu);
      return send(res, 200, session(body.email, nu));
    }
    if (u.pathname === '/auth/v1/recover') return send(res, 200, {});
    if (u.pathname === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'password') { const x = users.get(body.email); return x && x.password === body.password ? send(res, 200, session(body.email, x)) : send(res, 400, { error_description: 'Invalid login credentials' }); }
      for (const [email, x] of users) if (body.refresh_token === 'r-' + x.id) return send(res, 200, session(email, x));
      return send(res, 400, { error_description: 'Invalid Refresh Token' });
    }
    if (u.pathname === '/rest/v1/carnet_items') {
      const uid = (req.headers.authorization || '').replace('Bearer jwt-', '');
      if (![...users.values()].some(x => x.id === uid)) return send(res, 401, { message: 'JWT' });
      if (req.method === 'POST') {
        for (const r of body) { if (r.user_id !== uid) return send(res, 403, { message: 'RLS' });
          if (r.kind === 'invoice') { const o = rows.get(uid + '|' + r.kind + ':' + r.id), ar = x => !!(x && x.data && x.data.archive); const act = !o ? (ar(r) ? 'suppression' : 'creation') : ar(r) && !ar(o) ? 'suppression' : !ar(r) && ar(o) ? 'restauration' : 'modification'; journal.push({ user_id: uid, seq: journal.length + 1, action: act, numero: r.data.numero, data: r.data, at: new Date().toISOString() }); }
          rows.set(uid + '|' + r.kind + ':' + r.id, { ...r, updated_at: new Date().toISOString().replace('Z', String(++n).padStart(3, '0') + '+00:00') }); }
        return send(res, 201);
      }
      const gt = (u.searchParams.get('updated_at') || '').replace(/^gt\./, '');
      const out = [...rows.values()].filter(r => r.user_id === uid && (!gt || r.updated_at > gt)).sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
      const off = +u.searchParams.get('offset') || 0, lim = +u.searchParams.get('limit') || 1000;
      return send(res, 200, out.slice(off, off + lim).map(({ user_id, ...r }) => r));
    }
    if (u.pathname === '/rest/v1/carnet_journal') { const uid = (req.headers.authorization || '').replace('Bearer jwt-', ''); return send(res, 200, journal.filter(j => j.user_id === uid).reverse().map(({ user_id, ...j }) => j)); }
    send(res, 404, { message: 'not found' });
  });
}).listen(8766);
