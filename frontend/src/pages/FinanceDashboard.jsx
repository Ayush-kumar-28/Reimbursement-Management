import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function FinanceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [comments, setComments] = useState({});
  const [activeComment, setActiveComment] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/expenses').then((res) => setExpenses(res.data));

    // Auto-poll every 10 seconds
    const interval = setInterval(() => {
      api.get('/expenses').then((res) => setExpenses(res.data));
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/expenses/${id}/approve`, { action, comment: comments[id] || '' });
      const res = await api.get('/expenses');
      setExpenses(res.data);
      setActiveComment(null);
    } catch (err) { alert(err.response?.data?.message || 'Action failed'); }
  };

  const pending = expenses.filter((e) =>
    e.status === 'Pending' &&
    e.approvals?.some((a) => {
      const aid = a.approverId?._id || a.approverId;
      return String(aid) === String(user?._id) && a.status === 'Pending';
    })
  );

  const accentColor = user?.role === 'Director' ? '#8b5cf6' : '#0ea5e9';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar title={`${user?.role} Dashboard`} />
      <div className="page">
        <div className="stats-grid">
          <div className="stat-card" style={{ borderTop: `3px solid ${accentColor}` }}>
            <span className="stat-num">{pending.length}</span>
            <span className="stat-label">Awaiting My Approval</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
            <span className="stat-num">{expenses.filter(e => e.status === 'Approved').length}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #ef4444' }}>
            <span className="stat-num">{expenses.filter(e => e.status === 'Rejected').length}</span>
            <span className="stat-label">Rejected</span>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #6366f1' }}>
            <span className="stat-num">{expenses.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: '0.75rem' }}>
          Pending Approvals {pending.length > 0 && <span className="section-count" style={{ background: accentColor }}>{pending.length}</span>}
        </div>
        <div className="table-wrap" style={{ marginBottom: '2rem' }}>
          <table className="table">
            <thead><tr>
              <th>Employee</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {pending.length === 0 && <tr><td colSpan={7} className="table-empty">🎉 No pending approvals</td></tr>}
              {pending.map((e) => (
                <>
                  <tr key={e._id}>
                    <td><strong>{e.employee?.name}</strong></td>
                    <td>{e.category}</td>
                    <td>{e.ocrData?.vendor || '—'}</td>
                    <td><strong>{e.currency} {Number(e.amount).toFixed(2)}</strong></td>
                    <td>{new Date(e.date).toLocaleDateString()}</td>
                    <td><span className="badge badge-pending">Pending</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleAction(e._id, 'Approved')}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(e._id, 'Rejected')}>✕ Reject</button>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setActiveComment(activeComment === e._id ? null : e._id)}>💬</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/expenses/${e._id}`)}>View</button>
                      </div>
                    </td>
                  </tr>
                  {activeComment === e._id && (
                    <tr key={`${e._id}-c`}>
                      <td colSpan={7} style={{ background: '#f9fafb', padding: '0.75rem 1rem' }}>
                        <textarea className="form-input" style={{ marginBottom: 0 }}
                          placeholder="Add a comment..."
                          value={comments[e._id] || ''}
                          onChange={(ev) => setComments({ ...comments, [e._id]: ev.target.value })} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">All Expenses</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Employee</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td>{e.employee?.name}</td>
                  <td>{e.category}</td>
                  <td>{e.currency} {Number(e.amount).toFixed(2)}</td>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
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
