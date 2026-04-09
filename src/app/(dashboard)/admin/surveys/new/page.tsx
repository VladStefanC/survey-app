'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create survey');
        return;
      }

      router.push(`/admin/surveys/${data.survey.id}`);
    } catch {
      setError('A apărut o eroare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px', borderBottom: 'none', paddingBottom: 0 }}>Sondaj nou</h2>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ maxWidth: '500px' }}>
          <div className="form-row">
            <label className="label">Titlu *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <label className="label">Descriere</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-row">
            <label className="label">Slug (URL) *</label>
            <input
              type="text"
              className="input"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              required
              style={{ color: 'var(--accent2)' }}
            />
            <small style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '-6px', display: 'block', marginBottom: '14px' }}>
              Auto-generat din titlu, editabil
            </small>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
              Anulează
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Se creează...' : 'Creează sondaj'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
