// Cloudflare Pages Function: GET /api/contemplations
// Requires the environment variable KIT_API_KEY (Kit → Settings → Developer → V4 API key).
export async function onRequestGet({ env }) {
  const key = env.KIT_API_KEY;
  const json = (body, status = 200, extra = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
  if (!key) return json({ error: 'KIT_API_KEY not set' }, 500);
  const headers = { 'X-Kit-Api-Key': key, Accept: 'application/json' };
  try {
    const list = await fetch('https://api.kit.com/v4/broadcasts?per_page=50', { headers }).then(r => r.json());
    const ids = (list.broadcasts || []).map(b => b.id);
    const full = await Promise.all(ids.map(id =>
      fetch(`https://api.kit.com/v4/broadcasts/${id}`, { headers }).then(r => r.json()).then(d => d.broadcast).catch(() => null)
    ));
    const now = Date.now();
    const posts = full
      .filter(b => b && b.public && b.published_at && new Date(b.published_at).getTime() <= now)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .map(b => ({
        id: b.id,
        title: b.subject,
        excerpt: b.description || b.preview_text || '',
        publishedAt: b.published_at,
        thumbnail: b.thumbnail_url || null,
        thumbnailAlt: b.thumbnail_alt || '',
        html: b.content || '',
        url: b.public_url || null,
      }));
    return json({ posts }, 200, { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400' });
  } catch (e) {
    return json({ error: 'Could not reach Kit' }, 502);
  }
}
