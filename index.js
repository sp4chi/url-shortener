import express from 'express';
import pool from './db.js';
import { base62encode } from './utils/base62.js';

const app = express();
const PORT = 3000;

app.use(express.json());

function validate(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

app.post('/api/shorten', async (req, res) => {
  const { url } = req.body;

  if (!url || !validate(url)) {
    return res
      .status(400)
      .json({ error: 'Invalid URL. Must include http:// or https://' });
  }

  try {
    const insertResult = await pool.query(
      'INSERT INTO urls (original_url, short_code) VALUES ($1, $2) RETURNING id',
      [url, ''],
    );

    const newId = insertResult.rows[0].id;
    const shortCode = base62encode(newId);

    await pool.query('UPDATE urls SET short_code = $1 WHERE id = $2', [
      shortCode,
      newId,
    ]);

    res.json({ shortUrl: `http://localhost:${PORT}/${shortCode}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stats/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT original_url, short_code, clicks, created_at FROM urls WHERE short_code = $1',
      [shortCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    const row = result.rows[0];
    res.json({
      originalUrl: row.original_url,
      shortCode: row.short_code,
      clicks: row.clicks,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE short_code = $1',
      [shortCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Short link not found');
    }

    res.redirect(302, result.rows[0].original_url);

    // increment click count, but don't block the redirect waiting for it
    pool
      .query('UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1', [
        shortCode,
      ])
      .catch((err) => console.error('Failed to log click:', err));
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

app.get('/', (req, res) => {
  res.send('URL shortner is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
