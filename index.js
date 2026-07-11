import express from 'express';
import pool from './db.js';
const app = express();
const PORT = 3000;

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
