// Faux serveur Supabase (auth + table carnet_items) pour tester la synchronisation en local.
const http = require('http');
const rows = new Map(); let n = 0;
const send = (res, code, body) => { res.writeHead(code, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' }); res.end(body == null ? '' : JSON.stringify(body)); };
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const u = new URL(req.url, 'http://x'), body = b ? JSON.parse(b) : null;
    if (req.headers.apikey !== 'sb_publishable_KtecPpudCqwzvDItFGc58g_ITkQdoQ_') return send(res, 401, { message: 'Invalid API key' });
    if (u.pathname === '/auth/v1/token') {
      const ok = u.searchParams.get('grant_type') === 'password' ? (body.email === 'doc@test.dz' && body.password === 'secret') : body.refresh_token === 'r1';
      return ok ? send(res, 200, { access_token: 'jwt1', refresh_token: 'r1', expires_in: 3600, user: { id: 'u1', email: 'doc@test.dz' } }) : send(res, 400, { error_description: 'Invalid login credentials' });
    }
    if (u.pathname === '/rest/v1/carnet_items') {
      if (req.headers.authorization !== 'Bearer jwt1') return send(res, 401, { message: 'JWT' });
      if (req.method === 'POST') {
        for (const r of body) { if (r.user_id !== 'u1') return send(res, 403, { message: 'RLS' }); rows.set(r.kind + ':' + r.id, { ...r, updated_at: new Date(Date.now()).toISOString().replace('Z', String(++n).padStart(3, '0') + '+00:00') }); }
        return send(res, 201);
      }
      const gt = (u.searchParams.get('updated_at') || '').replace(/^gt\./, '');
      let out = [...rows.values()].filter(r => !gt || r.updated_at > gt).sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
      const off = +u.searchParams.get('offset') || 0, lim = +u.searchParams.get('limit') || 1000;
      return send(res, 200, out.slice(off, off + lim).map(({ user_id, ...r }) => r));
    }
    send(res, 404, { message: 'not found' });
  });
}).listen(8766);
