'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Contact {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

interface List {
  id: string;
  name: string;
}

function ListsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');

  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  // For selected list detail
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [surveyId, setSurveyId] = useState('');
  const [surveys, setSurveys] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchLists();
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (listId) {
      fetchListDetail(listId);
    }
  }, [listId]);

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      if (data.lists) {
        setLists(data.lists);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/surveys');
      const data = await res.json();
      if (data.surveys) {
        setSurveys(data.surveys.filter((s: any) => s.status === 'published'));
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
    }
  };

  const fetchListDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/lists/${id}`);
      const data = await res.json();
      if (data.list) {
        setSelectedList(data.list);
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch list:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName }),
      });

      if (res.ok) {
        fetchLists();
        setShowModal(false);
        setNewListName('');
      }
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această listă?')) return;

    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLists(lists.filter(l => l.id !== id));
        if (selectedList?.id === id) {
          setSelectedList(null);
          router.push('/admin/lists');
        }
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !selectedList) return;

    try {
      const res = await fetch(`/api/lists/${selectedList.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });

      if (res.ok) {
        fetchListDetail(selectedList.id);
        setShowAddContact(false);
        setNewEmail('');
        setNewName('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest contact?')) return;
    if (!selectedList) return;

    try {
      const res = await fetch(`/api/lists/${selectedList.id}/contacts?contact_id=${contactId}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts(contacts.filter(c => c.id !== contactId));
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedContact || !surveyId) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: selectedContact.id }),
      });

      const data = await res.json();
      if (data.link) {
        setGeneratedLink(data.link);
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (error) {
      console.error('Failed to generate link:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert('Link copiat!');
    }
  };

  // View for single list detail
  if (selectedList) {
    return (
      <div>
        <div className="page-header">
          <div>
            <Link href="/admin/lists" style={{ fontSize: '12px', color: 'var(--text3)', textDecoration: 'none' }}>← Înapoi la liste</Link>
            <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0, marginTop: '4px' }}>{selectedList.name}</h2>
          </div>
          <button onClick={() => setShowAddContact(true)} className="btn btn-primary">
            + Adaugă contact
          </button>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
            {contacts.length} contacte în listă
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📧</div>
            <div className="empty-state-title">Nu ai contacte</div>
            <button onClick={() => setShowAddContact(true)} className="btn btn-primary" style={{ marginTop: '16px' }}>
              + Adaugă contact
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg3)', padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '14px', fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'var(--text3)', letterSpacing: '1px' }}>
              <span style={{ flex: 1 }}>EMAIL</span>
              <span style={{ width: '120px' }}>NUME</span>
              <span style={{ width: '100px' }}>ACȚIUNI</span>
            </div>
            {contacts.map((contact) => (
              <div key={contact.id} style={{ display: 'flex', gap: '14px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>{contact.email}</span>
                <span style={{ width: '120px', color: 'var(--text3)' }}>{contact.name || '—'}</span>
                <div style={{ width: '100px', display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => { setSelectedContact(contact); setShowLinkModal(true); setGeneratedLink(null); }}
                    className="btn btn-ghost btn-s2"
                  >
                    Generează link
                  </button>
                  <button onClick={() => handleDeleteContact(contact.id)} className="btn btn-danger btn-sm" style={{ padding: '4px 5px' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddContact && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddContact(false)}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '16px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', marginBottom: '20px' }}>Adaugă contact</h3>
              <form onSubmit={handleAddContact}>
                <div className="form-row">
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="exemplu@email.com" autoFocus required />
                </div>
                <div className="form-row">
                  <label className="label">Nume (opțional)</label>
                  <input type="text" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nume Prenume" />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddContact(false)} className="btn btn-ghost">Anulează</button>
                  <button type="submit" className="btn btn-primary">Adaugă</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Generate Link Modal */}
        {showLinkModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLinkModal(false)}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', margin: '16px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', marginBottom: '20px' }}>
                Generează link pentru {selectedContact?.email}
              </h3>

              {!generatedLink ? (
                <>
                  <div className="form-row">
                    <label className="label">Alege sondajul *</label>
                    <select className="input" value={surveyId} onChange={(e) => setSurveyId(e.target.value)} style={{ margin: 0 }}>
                      <option value="">— alege un sondaj —</option>
                      {surveys.map((s) => (
                        <option key={s.id} value={s.id}>{s.title} ({s.slug})</option>
                      ))}
                    </select>
                  </div>
                  {surveys.length === 0 && <div className="alert warning">Nu ai niciun sondaj publicat.</div>}
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowLinkModal(false)} className="btn btn-ghost">Anulează</button>
                    <button onClick={handleGenerateLink} className="btn btn-primary" disabled={!surveyId || generating}>
                      {generating ? 'Se generează...' : 'Generează link'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <label className="label">Link generat</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="input" value={generatedLink} readOnly style={{ margin: 0, flex: 1 }} />
                      <button onClick={copyLink} className="btn btn-ghost">📋</button>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button onClick={() => setShowLinkModal(false)} className="btn btn-primary">Închide</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // View for lists
  return (
    <div>
      <div className="page-header">
        <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Liste contacte</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Listă nouă
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text3)' }}>Se încarcă...</p>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📧</div>
          <div className="empty-state-title">Nu ai nicio listă</div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '16px' }}>
            + Listă nouă
          </button>
        </div>
      ) : (
        lists.map((list) => (
          <div key={list.id} className="card" onClick={() => router.push(`/admin/lists?listId=${list.id}`)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title">{list.name}</div>
                <div className="card-sub">
                  {list.contact_count} contacte · creat{' '}
                  {new Date(list.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/lists?listId=${list.id}`); }} className="btn btn-ghost btn-sm">
                  Vezi contacte
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }} className="btn btn-danger btn-sm">
                  Șterge
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '16px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', marginBottom: '20px' }}>Listă nouă</h3>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <label className="label">Numele listei</label>
                <input type="text" className="input" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="ex: Clienți 2025" autoFocus />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Anulează</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Se creează...' : 'Creează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListsPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text3)' }}>Se încarcă...</p>}>
      <ListsPageContent />
    </Suspense>
  );
}
