'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '240px', background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '28px 0', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: 'var(--accent)', display: 'block' }}>
            SurveyApp
          </span>
          <small style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Admin Panel
          </small>
        </div>

        <nav>
          <div style={{ padding: '6px 0' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--text3)', padding: '8px 24px 4px' }}>
              Sondaje
            </div>
            <Link href="/admin/surveys" style={{ display: 'block', padding: '6px 24px', fontSize: '13px', color: 'var(--text2)', textDecoration: 'none', borderLeft: '2px solid transparent', transition: 'all .15s' }}>
              Lista sondajelor
            </Link>
            <Link href="/admin/lists" style={{ display: 'block', padding: '6px 24px', fontSize: '13px', color: 'var(--text2)', textDecoration: 'none', borderLeft: '2px solid transparent', transition: 'all .15s' }}>
              Liste contacte
            </Link>
          </div>
        </nav>

        <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', padding: '0 24px' }}>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            Deconectare
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '240px', flex: '1', padding: '40px 48px', maxWidth: '1100px' }}>
        {children}
      </main>
    </div>
  );
}
