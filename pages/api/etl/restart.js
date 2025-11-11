import etlFallback from '../../../src/mock-data/etl.json';
import { loadLaunches, buildMetrics } from '../../../src/lib/spacex';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const meta = await loadLaunches(true);
    const metrics = meta.launches.length ? buildMetrics(meta.launches) : etlFallback.metrics;

    return res.status(200).json({
      launches: meta.launches,
      metrics,
      fallbackUsed: meta.fallbackUsed,
      sourceUrl: meta.sourceUrl,
      fetchedAt: meta.fetchedAt
    });
  } catch (error) {
    console.error('[MiniETL] restart handler failed:', error);
    return res.status(500).json({
      message: 'Failed to restart pipeline',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

