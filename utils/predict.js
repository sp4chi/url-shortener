import * as ss from 'simple-statistics';

// Takes array of {day: number, clicks: number}, returns predicted clicks for future days
export function predictFutureClicks(dailyData, daysToPredict = 7) {
  if (dailyData.length < 3) {
    return { error: 'Not enough historical data to predict' };
  }

  const points = dailyData.map((d) => [d.day, d.clicks]);
  const regression = ss.linearRegression(points);
  const regressionLine = ss.linearRegressionLine(regression);

  const lastDay = dailyData[dailyData.length - 1].day;
  const predictions = [];

  for (let i = 1; i <= daysToPredict; i++) {
    const futureDay = lastDay + i;
    const predicted = Math.max(0, Math.round(regressionLine(futureDay)));
    predictions.push({ day: futureDay, predictedClicks: predicted });
  }

  // simple confidence range: +/- residual standard deviation
  const residuals = points.map(([x, y]) => y - regressionLine(x));
  const stdDev = ss.standardDeviation(residuals);

  return {
    predictions: predictions.map((p) => ({
      ...p,
      lowerBound: Math.max(0, Math.round(p.predictedClicks - stdDev)),
      upperBound: Math.round(p.predictedClicks + stdDev),
    })),
    slope: regression.m,
    trend:
      regression.m > 0
        ? 'increasing'
        : regression.m < 0
          ? 'decreasing'
          : 'flat',
  };
}
