
// Vercel serverless function: /api/ofd
// Прокси к API Яндекс ОФД. Нужен потому, что браузер не может ходить
// напрямую на public-api.ofd.yandex.net (CORS).
//
// Клиент вызывает:  /api/ofd?path=reports/receipts&from=2026-09-01&to=2026-09-01
// с заголовком:     X-Yandex-Ofd-Token: <токен>

const API_BASE = 'https://public-api.ofd.yandex.net/api';

const ALLOWED = [
  /^companies$/,
  /^retail_points$/,
  /^retail-points$/,
  /^cashboxes$/,
  /^cashboxes\/\d+$/,
  /^reference\/codes$/,
  /^reports\/receipts$/,
  /^reports\/shifts$/,
  /^meta$/
];

export default async function handler(req, res) {
  const token = req.headers['x-yandex-ofd-token'];
  if (!token) {
    return res.status(401).json({ error: 'Не передан токен (X-Yandex-Ofd-Token)' });
  }

  const { path, ...params } = req.query;
  if (!path || !ALLOWED.some(re => re.test(path))) {
    return res.status(400).json({ error: 'Недопустимый path: ' + path });
  }

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.append(k, Array.isArray(v) ? v.join(',') : v);
  });

  const url = `${API_BASE}/${path}${qs.toString() ? '?' + qs.toString() : ''}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-Yandex-Ofd-Token': token
      }
    });

    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: 'Не удалось связаться с ОФД: ' + String(e && e.message || e) });
  }
}
