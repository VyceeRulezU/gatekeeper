import { db } from './db';

/**
 * Checks if the given IP is rate limited for a specific route.
 * Limit: 5 attempts
 * Window: 15 minutes (900,000 ms)
 */
export async function isRateLimited(
  ip: string,
  route: string,
  limit: number = 5,
  windowMinutes: number = 15
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Clean up old rate limit logs occasionally (passive cleanup)
  try {
    const randomClean = Math.random() < 0.1; // 10% chance to run passive cleanup
    if (randomClean) {
      // Run in background asynchronously so it doesn't block the request
      db.rateLimitLog.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // delete logs older than 24h
        }
      }).catch(err => console.error('Rate limit log cleanup error:', err));
    }
  } catch (e) {
    // Ignore cleanup errors
  }

  // Count requests in the window
  const count = await db.rateLimitLog.count({
    where: {
      ip,
      route,
      createdAt: { gte: cutoff },
    },
  });

  return count >= limit;
}

/**
 * Logs a failed attempt in the database for rate limiting tracking.
 */
export async function logRateLimitAttempt(ip: string, route: string): Promise<void> {
  await db.rateLimitLog.create({
    data: {
      ip,
      route,
    },
  });
}
