import pool from '../db.js';

// Simulates realistic click decay: high clicks right after creation, tapering off over time
function generateClicksForDay(daysAgo, peakClicks) {
  // exponential decay formula: clicks fall off the further from day 0
  const decayRate = 0.15;
  const expectedClicks = Math.round(
    peakClicks * Math.exp(-decayRate * daysAgo),
  );

  // add some randomness so it's not a perfectly smooth curve (real data never is)
  const noise = Math.floor(Math.random() * (expectedClicks * 0.3));
  return Math.max(
    0,
    expectedClicks + noise - Math.floor(expectedClicks * 0.15),
  );
}

async function seedSyntheticClicks(
  shortCode,
  daysOfHistory = 30,
  peakClicks = 50,
) {
  const now = new Date();

  for (let daysAgo = daysOfHistory; daysAgo >= 0; daysAgo--) {
    const clicksThatDay = generateClicksForDay(daysAgo, peakClicks);

    for (let i = 0; i < clicksThatDay; i++) {
      const clickDate = new Date(now);
      clickDate.setDate(clickDate.getDate() - daysAgo);
      // spread clicks randomly through that day
      clickDate.setHours(Math.floor(Math.random() * 24));

      await pool.query(
        'INSERT INTO clicks (short_code, ip_address, clicked_at) VALUES ($1, $2, $3)',
        [shortCode, `synthetic-${i}`, clickDate],
      );
    }
  }

  console.log(`Seeded synthetic clicks for ${shortCode}`);
}

// Run this for a specific short_code you want to test predictions on
const targetShortCode = process.argv[2];
if (!targetShortCode) {
  console.error('Usage: node scripts/generate-synthetic-clicks.js <shortCode>');
  process.exit(1);
}

seedSyntheticClicks(targetShortCode)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
