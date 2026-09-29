// Vercel serverless function: returns Megan's public Kit broadcasts as Contemplations.
// Requires the environment variable KIT_API_KEY (Kit → Settings → Developer → V4 API key).
export default async function handler(req, res) {
  const key = process.env.KIT_API_KEY;
  if (!key) return res.status(500).json({ error: 'KIT_API_KEY not set' });
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
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.status(200).json({ posts });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Kit' });
  }
}
