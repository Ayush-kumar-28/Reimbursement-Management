import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get('/expenses').then((res) => setExpenses(res.data));
  }, [user]);

  const deleteDraft = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    await api.delete(`/expenses/${id}`);
    setExpenses(expenses.filter((e) => e._id !== id));
  };

  const submitDraft = async (id) => {
    try {
      await api.post(`/expenses/${id}/submit`);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) { alert(err.response?.data?.message || 'Submit failed'); }
  };

  const drafts = expenses.filter((e) => e.status === 'Draft');
  const submitted = expenses.filter((e) => e.status !== 'Draft');
  const approved = submitted.filter((e) => e.status === 'Approved').length;
  const pending = submitted.filter((e) => e.status === 'Pending').length;
  const rejected = submitted.filter((e) => e.status === 'Rejected').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar title="My Expenses" />
      <div className="page">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card" style={{ borderTop: '3px solid #6366f1' }}>
            <span className="stat-num">{submitted.length}</span>
            <span className="stat-label">Total Submitted</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
            <span className="stat-num">{approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
            <span className="stat-num">{pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #ef4444' }}>
            <span className="stat-num">{rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/employee/submit')}>
            + New Expense
          </button>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="section-title">
              💾 Drafts <span className="section-count">{drafts.length}</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr>
                  <th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {drafts.map((e) => (
                    <tr key={e._id}>
                      <td>{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                      <td>{e.category || '—'}</td>
                      <td>{Number(e.amount).toFixed(2)} {e.currency}</td>
                      <td><span className="badge badge-draft">Draft</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/employee/submit?draft=${e._id}`)}>✏️ Edit</button>
                          <button className="btn btn-success btn-sm" onClick={() => submitDraft(e._id)}>▶ Submit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteDraft(e._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submitted */}
        <div className="section-title">📋 Submitted Expenses</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Date</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Currency</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {submitted.length === 0 && <tr><td colSpan={7} className="table-empty">No submitted expenses yet</td></tr>}
              {submitted.map((e) => (
                <tr key={e._id}>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td>{e.category}</td>
                  <td>{e.ocrData?.vendor || '—'}</td>
                  <td><strong>{Number(e.amount).toFixed(2)}</strong></td>
                  <td>{e.currency}</td>
                  <td><span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/expenses/${e._id}`)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
