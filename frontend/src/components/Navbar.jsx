import { useAuth } from '../context/AuthContext';

const ROLE_COLOR = {
  Admin: 'role-admin', Manager: 'role-manager',
  Finance: 'role-finance', Director: 'role-director', Employee: 'role-employee',
};

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>💸</div>
        <span className="navbar-brand">ExpenseFlow</span>
        {title && <span style={{ color: '#d1d5db', margin: '0 0.25rem' }}>|</span>}
        {title && <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6b7280' }}>{title}</span>}
      </div>
      <div className="navbar-user">
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{user?.name}</span>
        <span className={`badge ${ROLE_COLOR[user?.role]}`}>{user?.role}</span>
        <div className="avatar">{initials}</div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
