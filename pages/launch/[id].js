import Link from 'next/link';
import { loadLaunches, fallbackLaunches } from '../../src/lib/spacex';

export default function LaunchDetail({ launch }) {
  return (
    <main style={container}>
      <header style={{ marginBottom: 24 }}>
        <Link href="/analytics" style={{ color: '#38bdf8', textDecoration: 'none' }}>← К аналитике</Link>
        <h1 style={{ margin: '12px 0 0', fontSize: 32 }}>{launch.name}</h1>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>{new Date(launch.date_utc).toLocaleString()}</p>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Основные данные</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Статус: {launch.success ? 'Success' : launch.upcoming ? 'Upcoming' : 'Failed'}</li>
          <li>Ракета: {launch.rocket}</li>
          <li>Космодром: {launch.launchpad}</li>
          <li>Количество полезных грузов: {launch.payloads.length}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Описание</h2>
        <p style={{ color: '#cbd5f5' }}>{launch.details || 'Описание отсутствует'}</p>
      </section>
    </main>
  );
}

export async function getServerSideProps({ params }) {
  const launches = await loadLaunches();
  let launch = launches.find((item) => String(item.id) == params.id);

  if (!launch) {
    // Try direct API fetch as fallback
    const apiUrl = process.env.SPACEX_API_URL || 'https://api.spacexdata.com/v5/launches';
    try {
      const response = await fetch(`${apiUrl}/${params.id}`);
      if (response.ok) {
        launch = await response.json();
      }
    } catch (error) {
      launch = null;
    }
  }

  if (!launch) {
    launch = fallbackLaunches().find((item) => item.id == params.id);
  }

  if (!launch) {
    return { notFound: true };
  }

  return {
    props: {
      launch: {
        ...launch,
        payloads: launch.payloads || []
      }
    }
  };
}

const container = {
  fontFamily: 'Inter, sans-serif',
  padding: '24px 32px',
  background: '#0b1120',
  color: '#f8fafc',
  minHeight: '100vh'
};

const card = {
  background: '#111c33',
  borderRadius: 16,
  padding: 24,
  border: '1px solid rgba(56,189,248,0.25)',
  boxShadow: '0 20px 28px rgba(8, 47, 73, 0.45)',
  marginBottom: 24
};

