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

app.get('/', (req, res) => {
  res.send('URL shortner is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
