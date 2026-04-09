'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  invitation_count: number;
  response_count: number;
}

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys');
      const data = await res.json();
      if (data.surveys) {
        setSurveys(data.surveys);
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest sondaj?')) return;
    
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSurveys(surveys.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete survey:', error);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Ești sigur? Respondenții nu vor mai putea accesa sondajul.')) return;
    
    try {
      const res = await fetch(`/api/surveys/${id}/close`, { method: 'POST' });
      if (res.ok) {
        fetchSurveys();
      }
    } catch (error) {
      console.error('Failed to close survey:', error);
    }
  };

  const filteredSurveys = surveys.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Publicat';
      case 'closed': return 'Închis';
      default: return status;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Sondajele mele</h2>
        <Link href="/admin/surveys/new" className="btn btn-primary">
          + Sondaj nou
        </Link>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '6px' }}>
        {['all', 'draft', 'published', 'closed'].map(f => (
          <span 
            key={f}
            onClick={() => setFilter(f)}
            className={`badge ${filter === f ? (f === 'all' ? 'badge-gray' : f === 'draft' ? 'badge-gray' : f === 'published' ? 'badge-green' : 'badge-red') : 'badge-gray'}`}
            style={{ cursor: 'pointer', padding: '5px 10px' }}
          >
            {f === 'all' ? 'Toate' : getStatusLabel(f)}
          </span>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text3)' }}>Se încarcă...</p>
      ) : filteredSurveys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Nu ai niciun sondaj</div>
          <p>Creează primul sondaj pentru a începe</p>
          <Link href="/admin/surveys/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
            + Sondaj nou
          </Link>
        </div>
      ) : (
        filteredSurveys.map((survey) => (
          <div key={survey.id} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div className="card-title">{survey.title}</div>
                <div className="card-sub" style={{ marginTop: '4px' }}>
                  slug: <code style={{ fontSize: '10px' }}>{survey.slug}</code> · creat{' '}
                  {new Date(survey.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`status ${survey.status}`}>{getStatusLabel(survey.status)}</span>
                  {survey.status === 'published' && (
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {survey.invitation_count} invitați · {survey.response_count} răspunsuri
                    </span>
                  )}
                  {survey.status === 'draft' && (
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      Invitațiile nu pot fi trimise încă
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {survey.status === 'draft' && (
                  <>
                    <Link href={`/admin/surveys/${survey.id}`} className="btn btn-ghost btn-sm">
                      Editează
                    </Link>
                  </>
                )}
                {survey.status === 'published' && (
                  <>
                    <Link href={`/admin/surveys/${survey.id}/results`} className="btn btn-ghost btn-sm">
                      Rezultate
                    </Link>
                    <button onClick={() => handleClose(survey.id)} className="btn btn-danger btn-sm">
                      Închide
                    </button>
                  </>
                )}
                {survey.status === 'closed' && (
                  <Link href={`/admin/surveys/${survey.id}/results`} className="btn btn-ghost btn-sm">
                    Rezultate
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
