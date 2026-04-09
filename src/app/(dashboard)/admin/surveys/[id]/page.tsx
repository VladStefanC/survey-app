'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: string;
  type: 'choice' | 'text';
  title: string;
  required: number;
  order_index: number;
  max_length: number;
  max_selections: number;
  options: { id: string; label: string }[];
}

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'closed';
}

export default function SurveyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ type: 'choice', title: '', required: false, options: ['', ''], max_selections: 1 });

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      const res = await fetch(`/api/surveys/${id}`);
      const data = await res.json();
      if (data.survey) {
        setSurvey(data.survey);
        setTitle(data.survey.title);
        setDescription(data.survey.description || '');
        setSlug(data.survey.slug);
        // Deduplicate questions by ID
        const uniqueQuestions = (data.questions || []).filter((q: any, index: number, self: any[]) => 
          index === self.findIndex((qq: any) => qq.id === q.id)
        );
        setQuestions(uniqueQuestions);
      }
      setLoading(false);
    };
    loadData();
  }, [params]);

  const handleSave = async () => {
    if (!survey) return;
    setSaving(true);
    try {
      await fetch(`/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, slug }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!survey) return;
    if (!confirm('Ești sigur? După publicare, structura întrebărilor nu mai poate fi modificată.')) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/publish`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
        const { id } = await params;
        const res2 = await fetch(`/api/surveys/${id}`);
        const data = await res2.json();
        setSurvey(data.survey);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!survey || !newQuestion.title) return;
    
    try {
      const res = await fetch(`/api/surveys/${survey.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newQuestion.type,
          title: newQuestion.title,
          required: newQuestion.required,
          options: newQuestion.type === 'choice' ? newQuestion.options.filter(o => o) : undefined,
        }),
      });

      if (res.ok) {
        const { id } = await params;
        const res2 = await fetch(`/api/surveys/${id}`);
        const data = await res2.json();
        // Deduplicate questions by ID
        const uniqueQuestions = (data.questions || []).filter((q: any, index: number, self: any[]) => 
          index === self.findIndex((qq: any) => qq.id === q.id)
        );
        setQuestions(uniqueQuestions);
        setShowQuestionModal(false);
        setNewQuestion({ type: 'choice', title: '', required: false, options: ['', ''], max_selections: 1 });
      }
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text3)' }}>Se încarcă...</p>;
  }

  if (!survey) {
    return <p>Sondajul nu a fost găsit</p>;
  }

  const isDraft = survey.status === 'draft';

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/admin/surveys" style={{ fontSize: '12px', color: 'var(--text3)', textDecoration: 'none' }}>← Înapoi la liste</Link>
          <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0, marginTop: '4px' }}>Editează sondaj</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isDraft && (
            <>
              <button onClick={handleSave} className="btn btn-ghost" disabled={saving}>
                {saving ? 'Se salvează...' : '💾 Salvează'}
              </button>
              <button onClick={handlePublish} className="btn btn-success" disabled={publishing}>
                {publishing ? 'Se publică...' : '🚀 Publică'}
              </button>
            </>
          )}
          {!isDraft && (
            <span className={`status ${survey.status}`}>
              {survey.status === 'published' ? 'Publicat' : 'Închis'}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div className="card">
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: 'var(--text3)', marginBottom: '12px' }}>
              DETALII SONDAJ
            </div>
            <div className="form-row">
              <label className="label">Titlu *</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isDraft}
              />
            </div>
            <div className="form-row">
              <label className="label">Descriere</label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={!isDraft}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="form-row">
              <label className="label">Slug *</label>
              <input
                type="text"
                className="input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!isDraft}
                style={{ color: 'var(--accent2)' }}
              />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: 'var(--text3)' }}>
              ÎNTREBĂRI ({questions.length})
            </div>
            {isDraft && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setShowQuestionModal(true)} className="btn btn-ghost btn-sm">
                  + Întrebare
                </button>
              </div>
            )}
          </div>

          {questions.length === 0 ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
              {isDraft ? 'Adaugă prima întrebare pentru acest sondaj' : 'Nu există întrebări'}
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="question">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text3)', marginRight: '8px' }}>{idx + 1}.</span>
                    <span className="question-title">{q.title}</span>
                    <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                      <span className="badge badge-blue">{q.type === 'choice' ? 'multi-choice' : 'text liber'}</span>
                      <span className={`badge ${q.required ? 'badge-yellow' : 'badge-gray'}`}>
                        {q.required ? 'required' : 'opțional'}
                      </span>
                      {q.type === 'choice' && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)' }}>
                          max {q.max_selections} selecții
                        </span>
                      )}
                      {q.type === 'text' && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)' }}>
                          max {q.max_length} caractere
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {q.type === 'choice' && q.options.length > 0 && (
                  <div style={{ paddingLeft: '20px', fontSize: '12px', color: 'var(--text3)' }}>
                    Opțiuni: {q.options.map(o => o.label).join(' · ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showQuestionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowQuestionModal(false)}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', margin: '16px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', marginBottom: '20px' }}>Adaugă întrebare</h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                onClick={() => setNewQuestion({ ...newQuestion, type: 'choice', options: ['', ''], max_selections: 1 })} 
                className={`btn ${newQuestion.type === 'choice' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              >
                ☑ Multi-choice
              </button>
              <button 
                onClick={() => setNewQuestion({ ...newQuestion, type: 'text', options: [], max_selections: 1 })} 
                className={`btn ${newQuestion.type === 'text' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              >
                ✎ Text liber
              </button>
            </div>

            <div className="form-row">
              <label className="label">Textul întrebării *</label>
              <input
                type="text"
                className="input"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text2)' }}>
                <input 
                  type="checkbox" 
                  checked={newQuestion.required}
                  onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                />
                Required
              </label>
              {newQuestion.type === 'choice' && (
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ marginBottom: '4px' }}>Selecții maxime</label>
                  <input 
                    type="number" 
                    className="input" 
                    defaultValue={1} 
                    min={1}
                    style={{ margin: 0, width: '80px' }}
                    onChange={(e) => setNewQuestion({ ...newQuestion, max_selections: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>

            {newQuestion.type === 'choice' && (
              <div className="form-row">
                <label className="label">Opțiuni (minim 2)</label>
                {newQuestion.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      className="input"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...newQuestion.options];
                        newOpts[idx] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: newOpts });
                      }}
                      style={{ margin: 0, flex: 1 }}
                      placeholder={`Opțiunea ${idx + 1}`}
                    />
                    {newQuestion.options.length > 2 && (
                      <button 
                        onClick={() => {
                          const newOpts = newQuestion.options.filter((_, i) => i !== idx);
                          setNewQuestion({ ...newQuestion, options: newOpts });
                        }} 
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red)' }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })} 
                  className="btn btn-ghost btn-sm"
                >
                  + Adaugă opțiune
                </button>
              </div>
            )}

            <div className="form-actions">
              <button onClick={() => setShowQuestionModal(false)} className="btn btn-ghost">Anulează</button>
              <button onClick={handleAddQuestion} className="btn btn-primary">Salvează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
