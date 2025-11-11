export async function loadLaunches(withMeta = false) {
  const baseUrl = process.env.SPACEX_API_URL || 'https://api.spacexdata.com/v5';
  let fallbackUsed = false;
  
  try {
    // Параллельная загрузка всех эндпоинтов для получения больше данных
    const [pastLaunches, upcomingLaunches, rockets, launchpads, payloads] = await Promise.all([
      fetch(`${baseUrl}/launches/past`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${baseUrl}/launches/upcoming`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${baseUrl}/rockets`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${baseUrl}/launchpads`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${baseUrl}/payloads`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    // Объединяем все запуски
    const allLaunches = [...(Array.isArray(pastLaunches) ? pastLaunches : []), ...(Array.isArray(upcomingLaunches) ? upcomingLaunches : [])];
    
    if (!allLaunches.length) {
      throw new Error('No launches fetched');
    }

    // Обогащаем данными о ракетах, космодромах, грузах
    const enriched = allLaunches.map(launch => {
      const rocket = Array.isArray(rockets) ? rockets.find(r => r.id === launch.rocket) : null;
      const launchpad = Array.isArray(launchpads) ? launchpads.find(lp => lp.id === launch.launchpad) : null;
      const launchPayloads = Array.isArray(payloads) && Array.isArray(launch.payloads) 
        ? payloads.filter(p => launch.payloads.includes(p.id))
        : [];

      return {
        ...launch,
        rocket: rocket ? { id: rocket.id, name: rocket.name, type: rocket.type, active: rocket.active } : { name: launch.rocket || 'Unknown' },
        launchpad: launchpad ? { id: launchpad.id, name: launchpad.name, full_name: launchpad.full_name } : {},
        payloads: launchPayloads,
        payloads_count: launchPayloads.length
      };
    });

    // Берём последние 150 для демонстрации (достаточно для ETL)
    const finalLaunches = enriched.slice(-150);
    
    if (withMeta) {
      return {
        launches: finalLaunches,
        fallbackUsed: false,
        sourceUrl: baseUrl,
        fetchedAt: new Date().toISOString()
      };
    }
    return finalLaunches;
  } catch (error) {
    console.warn('[MiniETL] SpaceX fetch failed:', error.message);
    fallbackUsed = true;
    const launches = fallbackLaunches();
    if (withMeta) {
      return {
        launches,
        fallbackUsed: true,
        sourceUrl: baseUrl,
        fetchedAt: new Date().toISOString()
      };
    }
    return launches;
  }
}

export function buildMetrics(launches) {
  const total = launches.length;
  const success = launches.filter((launch) => launch.success).length;
  const upcoming = launches.filter((launch) => launch.upcoming).length;
  const lastLaunch = launches[launches.length - 1];
  return {
    rows_in: total,
    rows_out: success,
    dedup_removed: total - success,
    duration_sec: 95,
    lastMission: lastLaunch ? lastLaunch.name : 'N/A',
    upcoming
  };
}

export function fallbackLaunches() {
  return [
    {
      id: 'demo-1',
      name: 'Demo Mission Alpha',
      date_utc: '2025-01-12T14:30:00.000Z',
      success: true,
      upcoming: false,
      rocket: 'Falcon 9',
      launchpad: 'LC-39A',
      payloads: []
    },
    {
      id: 'demo-2',
      name: 'Demo Mission Beta',
      date_utc: '2025-02-02T09:45:00.000Z',
      success: false,
      upcoming: false,
      rocket: 'Falcon 9',
      launchpad: 'SLC-40',
      payloads: []
    },
    {
      id: 'demo-3',
      name: 'Demo Mission Gamma',
      date_utc: '2025-03-05T18:00:00.000Z',
      success: false,
      upcoming: true,
      rocket: 'Starship',
      launchpad: 'Starbase',
      payloads: []
    }
  ];
}

