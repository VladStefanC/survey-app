'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  invited: number;
  sent: number;
  email_opened: number;
  survey_opened: number;
  submitted: number;
  bounced: number;
}

interface Question {
  id: string;
  type: 'choice' | 'text';
  title: string;
  required: number;
  order_index: number;
  choice_responses: number;
  text_responses: number;
  options?: { id: string; label: string; count: number }[];
  answers?: { text_value: string; submitted_at: string }[];
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [surveyTitle, setSurveyTitle] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      const res = await fetch(`/api/surveys/${id}/results`);
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        setQuestions(data.questions || []);
      }
      setLoading(false);
    };
    loadData();
  }, [params]);

  if (loading) {
    return <p style={{ color: 'var(--text3)' }}>Se încarcă...</p>;
  }

  if (!stats) {
    return <p>Nu există rezultate</p>;
  }

  const completionRate = stats.survey_opened > 0 
    ? Math.round((stats.submitted / stats.survey_opened) * 100) 
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/admin/surveys" style={{ fontSize: '12px', color: 'var(--text3)', textDecoration: 'none' }}>← Înapoi la liste</Link>
          <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0, marginTop: '4px' }}>Rezultate sondaj</h2>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-val">{stats.invited}</div>
          <div className="stat-lbl">INVITAȚI</div>
        </div>
        <div className="stat">
          <div className="stat-val">{stats.sent}</div>
          <div className="stat-lbl">TRIMIȘI</div>
        </div>
        <div className="stat">
          <div className="stat-val">{stats.email_opened}</div>
          <div className="stat-lbl">DESCHISE</div>
        </div>
        <div className="stat">
          <div className="stat-val">{stats.survey_opened}</div>
          <div className="stat-lbl">VĂZUTE</div>
        </div>
        <div className="stat">
          <div className="stat-val">{stats.submitted}</div>
          <div className="stat-lbl">RĂSPUNSURI</div>
        </div>
        <div className="stat">
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{completionRate}%</div>
          <div className="stat-lbl">RATĂ COMPLETARE</div>
        </div>
      </div>

      <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Statistici pe întrebări</h3>

      {questions.length === 0 ? (
        <p style={{ color: 'var(--text3)' }}>Nu există întrebări</p>
      ) : (
        questions.map((q, idx) => (
          <div key={q.id} className="card" style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div className="card-title">{idx + 1}. {q.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                {q.type === 'choice' ? 'multi-choice' : 'text liber'} · {q.type === 'choice' ? q.choice_responses : q.text_responses} răspunsuri
              </div>
            </div>

            {q.type === 'choice' && q.options && q.options.length > 0 && (
              <div>
                {q.options.map((opt) => {
                  const total = q.choice_responses || 1;
                  const pct = Math.round((opt.count / total) * 100);
                  return (
                    <div key={opt.id} className="bar-row">
                      <div className="bar-lbl">{opt.label}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="bar-pct" style={{ color: 'var(--text2)' }}>
                        {pct}% <span style={{ color: 'var(--text3)' }}>({opt.count})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'text' && (
              <div>
                {q.answers && q.answers.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {q.answers.map((ans, i) => (
                      <div key={i} style={{ 
                        padding: '12px 0', 
                        borderBottom: '1px solid var(--border)',
                        fontSize: '13px',
                        color: 'var(--text)'
                      }}>
                        {ans.text_value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                    {q.text_responses} răspunsuri text
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
