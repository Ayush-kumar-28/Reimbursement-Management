import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', country: '' });
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then((res) => {
        const list = res.data
          .filter((c) => c.currencies && Object.keys(c.currencies).length > 0)
          .map((c) => ({
            name: c.name.common,
            currency: Object.keys(c.currencies)[0],
            currencyName: Object.values(c.currencies)[0]?.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch(() => setCountries([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = countries.find((c) => c.name === form.country);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ margin: '0 0 0.25rem' }}>Create Account</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Set up your company workspace
        </p>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Your Name *</label>
          <input style={styles.input} placeholder="John Smith" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <label style={styles.label}>Email *</label>
          <input style={styles.input} type="email" placeholder="john@company.com" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <label style={styles.label}>Password *</label>
          <input style={styles.input} type="password" placeholder="Set a password" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

          <label style={styles.label}>Company Name *</label>
          <input style={styles.input} placeholder="Acme Corp" required
            value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />

          <label style={styles.label}>Country *</label>
          <select style={styles.input} required value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="">— Select Country —</option>
            {countries.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Show detected currency */}
          {selectedCountry && (
            <div style={styles.currencyHint}>
              🏦 Default currency will be set to{' '}
              <strong>{selectedCountry.currency}</strong> — {selectedCountry.currencyName}
            </div>
          )}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' },
  card: { background: '#fff', padding: '2rem', borderRadius: '10px', width: '380px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' },
  input: { display: 'block', width: '100%', padding: '0.6rem 0.75rem', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '0.9rem' },
  btn: { width: '100%', padding: '0.7rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' },
  error: { color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.88rem' },
  currencyHint: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#166534' },
};
