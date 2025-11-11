import Link from 'next/link';
import { loadLaunches } from '../src/lib/spacex';

export default function Analytics({ launches }) {
  return (
    <main style={container}>
      <header style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>← Назад</Link>
        <h1 style={{ margin: '12px 0 0', fontSize: 32 }}>📈 Analytics — SpaceX Launches</h1>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>Демонстрация шага Transform: агрегируем данные перед загрузкой.</p>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Launches overview</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Mission</th>
              <th style={th}>Date</th>
              <th style={th}>Success</th>
              <th style={th}>Rocket</th>
            </tr>
          </thead>
          <tbody>
            {launches.map((launch) => (
              <tr key={launch.id}>
                <td style={td}>
                  <Link href={`/launch/${launch.id}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                    {launch.name}
                  </Link>
                </td>
                <td style={td}>{new Date(launch.date_utc).toLocaleString()}</td>
                <td style={td}>{launch.success ? '✅' : '❌'}</td>
                <td style={td}>{launch.rocket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Что будет в полной версии</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#94a3b8' }}>
          <li>Интеграция с ClickHouse / BigQuery для аналитики и виджетов</li>
          <li>Задачи на Airflow/Prefect для регулярного обновления данных</li>
          <li>Инкрементальная загрузка + дедупликация на уровне dbt</li>
        </ul>
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  const launches = await loadLaunches();
  return {
    props: {
      launches
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

const th = {
  textAlign: 'left',
  padding: '12px 16px',
  textTransform: 'uppercase',
  fontSize: 12,
  color: '#94a3b8',
  borderBottom: '1px solid rgba(148,163,184,0.2)'
};

const td = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(148,163,184,0.08)',
  color: '#e2e8f0'
};

