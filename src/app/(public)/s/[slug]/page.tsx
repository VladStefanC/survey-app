'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

interface Question {
  id: string;
  type: 'choice' | 'text';
  title: string;
  required: number;
  max_selections: number;
  max_length: number;
  options: { id: string; label: string }[];
}

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  response_count: number;
}

function SurveyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const token = searchParams.get('t') || '';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ error: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string[] | string }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !token) {
      setError({ error: 'MISSING', message: 'Link invalid' });
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/public/surveys/${slug}?t=${token}`);
        const data = await res.json();

        if (data.error) {
          setError(data);
          return;
        }

        setSurvey(data.survey);
        setQuestions(data.questions || []);
      } catch (err) {
        setError({ error: 'INVALID', message: 'Link invalid' });
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [slug, token]);

  const handleOptionToggle = (questionId: string, optionId: string, maxSelections: number) => {
    const current = (answers[questionId] as string[]) || [];
    
    if (current.includes(optionId)) {
      setAnswers({ ...answers, [questionId]: current.filter(id => id !== optionId) });
    } else {
      if (current.length >= maxSelections) {
        return;
      }
      setAnswers({ ...answers, [questionId]: [...current, optionId] });
    }
    setPageError(null);
  };

  const handleTextChange = (questionId: string, value: string, maxLength: number) => {
    if (value.length > maxLength) return;
    setAnswers({ ...answers, [questionId]: value });
    setPageError(null);
  };

  const validateCurrentQuestion = (): boolean => {
    const q = questions[currentIndex];
    if (!q.required) return true;
    
    if (q.type === 'choice') {
      const selected = (answers[q.id] as string[]) || [];
      if (selected.length === 0) {
        setPageError('Te rugăm să selectezi o opțiune.');
        return false;
      }
    } else {
      const value = answers[q.id] as string || '';
      if (!value.trim()) {
        setPageError('Te rugăm să completezi câmpul.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentQuestion()) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPageError(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setPageError(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentQuestion()) return;

    setSubmitting(true);
    try {
      const formattedAnswers = questions.map(q => ({
        question_id: q.id,
        option_ids: q.type === 'choice' ? (answers[q.id] as string[]) || [] : undefined,
        text_value: q.type === 'text' ? answers[q.id] as string : undefined,
      }));

      const res = await fetch(`/api/public/surveys/${slug}/responses?t=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setPageError(data.errors[0]?.message || 'A apărut o eroare.');
        }
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      setPageError('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="closed-page">
        <div className="closed-icon">⏳</div>
        <div className="closed-title">Se încarcă...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="closed-page">
        <div className="closed-icon">🔗</div>
        <div className="closed-title">
          {error.error === 'CLOSED' ? 'Sondaj închis' : 
           error.error === 'ALREADY_SUBMITTED' ? 'Deja completat' : 'Link invalid'}
        </div>
        <div className="closed-sub">{error.message}</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="closed-page">
        <div className="closed-icon">✅</div>
        <div className="closed-title">Răspunsurile tale au fost înregistrate</div>
        <div className="closed-sub">Mulțumim pentru participare! Poți închide această fereastră.</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: 'var(--text)', marginBottom: '4px' }}>
          {survey?.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
          Întrebarea {currentIndex + 1} din {questions.length}
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '24px', marginBottom: '24px', flex: 1 }}>
        <div style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '16px', fontWeight: 500 }}>
          {currentQuestion.title} {currentQuestion.required && <span style={{ color: 'var(--red)' }}>*</span>}
        </div>

        {currentQuestion.type === 'choice' && (
          <>
            <div className="counter">
              Selectează maxim {currentQuestion.max_selections} {currentQuestion.max_selections === 1 ? 'opțiune' : 'opțiuni'}
            </div>
            <div className="checkbox-group">
              {currentQuestion.options.map(opt => {
                const selected = ((answers[currentQuestion.id] as string[]) || []).includes(opt.id);
                const maxReached = ((answers[currentQuestion.id] as string[]) || []).length >= currentQuestion.max_selections;
                const disabled = !selected && maxReached;

                return (
                  <div
                    key={opt.id}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    className={`checkbox ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && handleOptionToggle(currentQuestion.id, opt.id, currentQuestion.max_selections)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        !disabled && handleOptionToggle(currentQuestion.id, opt.id, currentQuestion.max_selections);
                      }
                    }}
                  >
                    <div className="check-box">
                      <svg width="10" height="8" viewBox="0 0 10 8">
                        <polyline points="1,4 4,7 9,1" stroke="#000" strokeWidth="1.8" fill="none" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '14px', color: disabled ? 'var(--text3)' : 'var(--text)' }}>
                      {opt.label}
                    </span>
                    {disabled && (
                      <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
                        MAXIM ATINS
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {((answers[currentQuestion.id] as string[]) || []).length > 0 && (
              <div className="counter warn">{(answers[currentQuestion.id] as string[]).length}/{currentQuestion.max_selections} selecții utilizate</div>
            )}
          </>
        )}

        {currentQuestion.type === 'text' && (
          <>
            <textarea
              className="input"
              style={{ height: '120px', resize: 'vertical', fontSize: '14px' }}
              placeholder="Scrie răspunsul tău..."
              value={(answers[currentQuestion.id] as string) || ''}
              onChange={(e) => handleTextChange(currentQuestion.id, e.target.value, currentQuestion.max_length)}
              maxLength={currentQuestion.max_length}
            />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: 'var(--text3)', textAlign: 'right', marginTop: '4px' }}>
              {((answers[currentQuestion.id] as string) || '').length} / {currentQuestion.max_length}
            </div>
          </>
        )}

        {pageError && (
          <div style={{ fontSize: '13px', color: 'var(--red)', marginTop: '12px' }}>
            {pageError}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '14px', opacity: currentIndex === 0 ? 0.5 : 1 }}
          >
            ← Înapoi
          </button>
          
          {isLastQuestion ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center', padding: '14px', fontSize: '14px' }}
              disabled={submitting}
            >
              {submitting ? 'Se trimite...' : 'Trimite răspunsurile'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center', padding: '14px', fontSize: '14px' }}
            >
              Următoarea →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicSurveyPage() {
  return (
    <Suspense fallback={
      <div className="closed-page">
        <div className="closed-icon">⏳</div>
        <div className="closed-title">Se încarcă...</div>
      </div>
    }>
      <SurveyContent />
    </Suspense>
  );
}
