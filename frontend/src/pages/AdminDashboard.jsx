import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Employee', 'Manager', 'Finance', 'Director'];
const emptyUser = { name: '', email: '', password: '', role: 'Employee', managerId: '' };

export default function AdminDashboard() {
  const { user, company, logout } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rules, setRules] = useState([]);
  const [newUser, setNewUser] = useState(emptyUser);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data));
    api.get('/expenses').then((r) => setExpenses(r.data));
    api.get('/rules').then((r) => setRules(r.data));
  }, []);

  const createUser = async (e) => {
    e.preventDefault(); setUserError(''); setUserSuccess('');
    try {
      const res = await api.post('/users', newUser);
      setUsers((prev) => [...prev, res.data]);
      setUserSuccess(`✓ ${newUser.role} "${newUser.name}" created — login: ${newUser.email}`);
      setNewUser(emptyUser);
    } catch (err) { setUserError(err.response?.data?.message || 'Failed'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    setUsers(users.filter((u) => u._id !== id));
  };

  const startEdit = (u) => {
    setEditingUser({ id: u._id, name: u.name, role: u.role, managerId: u.manager?._id || '' });
    setEditError('');
  };

  const saveEdit = async () => {
    try {
      const res = await api.put(`/users/${editingUser.id}`, {
        name: editingUser.name, role: editingUser.role, managerId: editingUser.managerId || null,
      });
      setUsers(users.map((u) => (u._id === editingUser.id ? res.data : u)));
      setEditingUser(null);
    } catch (err) { setEditError(err.response?.data?.message || 'Update failed'); }
  };

  const overrideExpense = async (id, status) => {
    await api.put(`/expenses/${id}/override`, { status });
    const res = await api.get('/expenses');
    setExpenses(res.data);
  };

  const managers = users.filter((u) => u.role === 'Manager');
  const setU = (k) => (e) => setNewUser({ ...newUser, [k]: e.target.value });
  const totalReimbursed = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (Number(e.convertedAmount) || 0), 0);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)',
        padding: '0 2rem 2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Navbar inside hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', backdropFilter: 'blur(4px)' }}>💸</div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>ExpenseFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{user?.email}</span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{initials}</div>
            <button onClick={logout} style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Company Info */}
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', backdropFilter: 'blur(4px)' }}>🏢</div>
                <div>
                  <h1 style={{ color: '#fff', margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {company?.name || 'Your Company'}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                      🌍 {company?.country || 'N/A'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                      💱 {company?.defaultCurrency || 'USD'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                      Admin
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Quick stats in header */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Employees', value: users.filter(u => u.role === 'Employee').length, icon: '👤' },
                { label: 'Managers', value: users.filter(u => u.role === 'Manager').length, icon: '👔' },
                { label: 'Finance', value: users.filter(u => u.role === 'Finance').length, icon: '💼' },
                { label: 'Directors', value: users.filter(u => u.role === 'Director').length, icon: '🎯' },
                { label: 'Pending', value: expenses.filter(e => e.status === 'Pending').length, icon: '⏳' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '0.75rem 1.25rem', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.1rem' }}>{s.icon}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem', marginTop: '-1.5rem' }}>
          {[
            { label: 'Employees', value: users.filter(u => u.role === 'Employee').length, color: '#6366f1', icon: '👤' },
            { label: 'Managers', value: users.filter(u => u.role === 'Manager').length, color: '#0ea5e9', icon: '👔' },
            { label: 'Finance', value: users.filter(u => u.role === 'Finance').length, color: '#f59e0b', icon: '💼' },
            { label: 'Directors', value: users.filter(u => u.role === 'Director').length, color: '#8b5cf6', icon: '🎯' },
            { label: 'Total Reimbursed', value: `${company?.defaultCurrency || ''} ${totalReimbursed.toFixed(0)}`, color: '#10b981', icon: '💰' },
            { label: 'Active Rules', value: rules.length, color: '#ef4444', icon: '⚙️' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '0 1.5rem' }}>
            {[{ key: 'users', label: '👥 Users' }, { key: 'expenses', label: '💸 Expenses' }, { key: 'rules', label: '⚙️ Rules' }].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '1rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.88rem', fontFamily: 'inherit',
                color: tab === t.key ? '#6366f1' : '#9ca3af',
                borderBottom: `2px solid ${tab === t.key ? '#6366f1' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ padding: '1.5rem' }}>

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
              <div>
                {/* Create User Form */}
                <div style={{ background: 'linear-gradient(135deg, #f8faff, #f0f4ff)', border: '1px solid #e0e7ff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>➕ Create New User</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Set login credentials — they'll use this email & password to sign in.</p>
                  {userError && <div className="alert alert-error">{userError}</div>}
                  {userSuccess && <div className="alert alert-success">{userSuccess}</div>}
                  <form onSubmit={createUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" placeholder="John Smith" required value={newUser.name} onChange={setU('name')} />
                      </div>
                      <div>
                        <label className="form-label">Email *</label>
                        <input className="form-input" type="email" placeholder="john@company.com" required value={newUser.email} onChange={setU('email')} />
                      </div>
                      <div>
                        <label className="form-label">Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Set password" required value={newUser.password} onChange={setU('password')} style={{ paddingRight: '2.5rem' }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {showPassword ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Role *</label>
                        <select className="form-input" value={newUser.role} onChange={setU('role')}>
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      {newUser.role === 'Employee' && (
                        <div>
                          <label className="form-label">Assign Manager</label>
                          <select className="form-input" value={newUser.managerId} onChange={setU('managerId')}>
                            <option value="">— No Manager —</option>
                            {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary" type="submit">Create Account</button>
                  </form>
                </div>

                {editError && <div className="alert alert-error">{editError}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['User', 'Email', 'Role', 'Manager', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      editingUser?.id === u._id ? (
                        <tr key={u._id} style={{ background: '#fefce8', borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.6rem 1rem' }}><input className="cell-input" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} /></td>
                          <td style={{ padding: '0.6rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }}>{u.email}</td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <select className="cell-input" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r}>{r}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <select className="cell-input" value={editingUser.managerId} onChange={(e) => setEditingUser({ ...editingUser, managerId: e.target.value })}>
                              <option value="">— None —</option>
                              {managers.filter(m => m._id !== u._id).map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-success btn-sm" onClick={saveEdit}>Save</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={u._id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.name}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6b7280', fontSize: '0.85rem' }}>{u.email}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6b7280', fontSize: '0.85rem' }}>{u.manager?.name || '—'}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>✏️ Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u._id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                    {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No users yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── EXPENSES TAB ── */}
            {tab === 'expenses' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Employee', 'Category', 'Vendor', 'Amount', 'Date', 'Status', 'Override'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e._id} style={{ borderBottom: '1px solid #f9fafb' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#4f46e5' }}>
                            {e.employee?.name?.charAt(0)}
                          </div>
                          <strong style={{ fontSize: '0.88rem' }}>{e.employee?.name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>{e.category}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#6b7280' }}>{e.ocrData?.vendor || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.88rem' }}>{e.currency} {Number(e.amount).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#6b7280' }}>{new Date(e.date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span></td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => overrideExpense(e._id, 'Approved')}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => overrideExpense(e._id, 'Rejected')}>✕ Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No expenses yet</td></tr>}
                </tbody>
              </table>
            )}

            {/* ── RULES TAB ── */}
            {tab === 'rules' && <RulesTab users={users} rules={rules} setRules={setRules} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rules Tab ──────────────────────────────────────────────────
function RulesTab({ users, rules, setRules }) {
  const blank = { name: '', description: '', appliesTo: '', type: 'sequential', steps: [], minApprovalPercentage: 60, autoApproveIf: '' };
  const [form, setForm] = useState(blank);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [error, setError] = useState('');
  const approvers = users.filter((u) => u.role !== 'Employee');

  const addApprover = () => {
    if (!selectedApprover || form.steps.find((s) => s.approverId === selectedApprover)) return;
    setForm({ ...form, steps: [...form.steps, { approverId: selectedApprover, order: form.steps.length + 1, required: false }] });
    setSelectedApprover('');
  };

  const removeStep = (id) =>
    setForm({ ...form, steps: form.steps.filter((s) => s.approverId !== id).map((s, i) => ({ ...s, order: i + 1 })) });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.steps.length === 0) return setError('Add at least one approver.');
    try {
      const payload = { ...form, appliesTo: form.appliesTo || null, autoApproveIf: form.type === 'hybrid' ? (form.autoApproveIf || null) : null, minApprovalPercentage: form.type === 'sequential' ? 100 : Number(form.minApprovalPercentage) };
      const res = await api.post('/rules', payload);
      setRules((prev) => [...prev, res.data]);
      setForm(blank);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const deleteRule = async (id) => {
    await api.delete(`/rules/${id}`);
    setRules((prev) => prev.filter((r) => r._id !== id));
  };

  const typeColors = { sequential: { bg: '#dbeafe', color: '#1e40af', label: '🔢 Sequential' }, parallel: { bg: '#d1fae5', color: '#065f46', label: '⚡ Parallel' }, hybrid: { bg: '#fef3c7', color: '#92400e', label: '🔀 Hybrid' } };

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #f8faff, #f0f4ff)', border: '1px solid #e0e7ff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>⚙️ Create Approval Rule</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div><label className="form-label">Rule Name *</label><input className="form-input" placeholder="e.g. Default Rule" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="form-label">Applies To</label>
              <select className="form-input" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
                <option value="">— All Employees —</option>
                {users.filter(u => u.role === 'Employee').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Description</label><input className="form-input" placeholder="Optional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Rule Type *</label>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {['sequential', 'parallel', 'hybrid'].map((t) => (
                <label key={t} onClick={() => setForm({ ...form, type: t })} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.6rem 1.1rem', borderRadius: 10, border: `2px solid ${form.type === t ? '#6366f1' : '#e5e7eb'}`, background: form.type === t ? '#ede9fe' : '#fff', fontWeight: form.type === t ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.15s', userSelect: 'none' }}>
                  {typeColors[t].label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Approvers</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', marginBottom: '0.75rem' }}>
              <select className="form-input" style={{ flex: 1 }} value={selectedApprover} onChange={(e) => setSelectedApprover(e.target.value)}>
                <option value="">Select approver</option>
                {approvers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
              </select>
              <button type="button" className="btn btn-primary" onClick={addApprover}>+ Add</button>
            </div>
            {form.steps.length > 0 && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'left' }}>Step</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'left' }}>Approver</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'left' }}>Role</th>
                    {form.type === 'hybrid' && <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>⚡ Trigger</th>}
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {form.steps.map((step) => {
                      const u = users.find(u => u._id === step.approverId);
                      return (
                        <tr key={step.approverId} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#6366f1' }}>{step.order}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{u?.name}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge role-${u?.role?.toLowerCase()}`}>{u?.role}</span></td>
                          {form.type === 'hybrid' && <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}><input type="radio" name="autoApproveIf" checked={form.autoApproveIf === step.approverId} onChange={() => setForm({ ...form, autoApproveIf: step.approverId })} /></td>}
                          <td style={{ padding: '0.6rem 0.75rem' }}><button type="button" className="btn btn-danger btn-sm" onClick={() => removeStep(step.approverId)}>Remove</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(form.type === 'parallel' || form.type === 'hybrid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Min Approval %</label>
                <input className="form-input" style={{ width: 80 }} type="number" min="1" max="100" value={form.minApprovalPercentage} onChange={(e) => setForm({ ...form, minApprovalPercentage: e.target.value })} />
              </div>
              {form.steps.length > 0 && <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>= at least {Math.ceil(form.steps.length * form.minApprovalPercentage / 100)} of {form.steps.length} needed</span>}
            </div>
          )}
          <button className="btn btn-primary" type="submit">Save Rule</button>
        </form>
      </div>

      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem' }}>Active Rules</div>
      {rules.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No rules yet. Create one above.</div>}
      {rules.map((r) => (
        <div key={r._id} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <strong>{r.name}</strong>
              <span className="badge" style={{ background: typeColors[r.type]?.bg, color: typeColors[r.type]?.color }}>{typeColors[r.type]?.label}</span>
              {r.appliesTo && <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>For: {r.appliesTo.name}</span>}
            </div>
            {r.description && <p style={{ margin: '0 0 0.4rem', color: '#6b7280', fontSize: '0.82rem' }}>{r.description}</p>}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {r.steps?.sort((a, b) => a.order - b.order).map((step, i) => (
                <span key={i} style={{ background: '#f3f4f6', color: '#374151', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                  {step.order}. {step.approverId?.name}{r.autoApproveIf?._id === step.approverId?._id && ' ⚡'}
                </span>
              ))}
            </div>
            {r.type !== 'sequential' && <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>Min {r.minApprovalPercentage}% approval</span>}
          </div>
          <button className="btn btn-danger btn-sm" style={{ marginLeft: '1rem', flexShrink: 0 }} onClick={() => deleteRule(r._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
