import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const DOT_COLOR = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444', Waiting: '#6366f1' };

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);

  useEffect(() => {
    api.get(`/expenses/${id}`).then((res) => setExpense(res.data));
  }, [id]);

  if (!expense) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar />
      <div className="page" style={{ textAlign: 'center', paddingTop: '4rem', color: '#9ca3af' }}>Loading...</div>
    </div>
  );

  const lines = expense.ocrData?.expenseLines || [];
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0) || expense.amount;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar title="Expense Detail" />
      <div className="page" style={{ maxWidth: 760 }}>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={() => navigate(-1)}>
          ← Back
        </button>

        {/* Header Card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>
                {expense.ocrData?.vendor || expense.category}
              </h2>
              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                Submitted by {expense.employee?.name} · {new Date(expense.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className={`badge badge-${expense.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.3rem 1rem' }}>
              {expense.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Category', value: expense.category },
              { label: 'Date', value: new Date(expense.date).toLocaleDateString() },
              { label: 'Amount', value: `${expense.currency} ${Number(expense.amount).toFixed(2)}`, highlight: true },
              { label: 'Converted', value: `${expense.convertedCurrency} ${Number(expense.convertedAmount).toFixed(2)}` },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ fontWeight: item.highlight ? 700 : 500, color: item.highlight ? '#6366f1' : '#1f2937' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {expense.description && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 8, fontSize: '0.88rem', color: '#4b5563' }}>
              {expense.description}
            </div>
          )}
          {expense.receiptUrl && (
            <div style={{ marginTop: '0.75rem' }}>
              <a href={`/${expense.receiptUrl}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                📎 View Receipt
              </a>
            </div>
          )}
        </div>

        {/* Expense Lines */}
        {lines.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>Expense Lines</div>
            <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <table className="table">
                <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td>{l.description}</td>
                      <td style={{ textAlign: 'right' }}>{Number(l.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700, padding: '0.75rem 1rem' }}>Total</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366f1', padding: '0.75rem 1rem' }}>
                      {expense.currency} {Number(total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Approval Timeline */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Approval Progress</div>
          <div className="timeline">
            {expense.approvals.map((a, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" style={{ background: DOT_COLOR[a.status] || '#d1d5db' }} />
                {i < expense.approvals.length - 1 && <div className="timeline-line" />}
                <div className="timeline-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600 }}>Step {a.step} — {a.approverId?.name}</span>
                    <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{a.approverId?.role}</span>
                  {a.comment && <p style={{ margin: '0.3rem 0 0', fontStyle: 'italic', color: '#6b7280', fontSize: '0.85rem' }}>"{a.comment}"</p>}
                  {a.actionAt && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(a.actionAt).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
