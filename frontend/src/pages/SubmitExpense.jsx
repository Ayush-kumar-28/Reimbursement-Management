import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Training', 'Other'];
const emptyLine = () => ({ description: '', quantity: 1, unitPrice: '', amount: 0 });

const extractOcrFields = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const amountMatch =
    text.match(/(?:total|amount|grand total|subtotal)[^\d]*(\d{1,6}[.,]\d{2})/i) ||
    text.match(/\$\s*(\d{1,6}[.,]\d{2})/) ||
    text.match(/(\d{1,6}[.,]\d{2})\s*(?:USD|INR|EUR|GBP)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  const currencyMatch = text.match(/\b(USD|INR|EUR|GBP|AED|SGD|CAD|AUD|JPY|CNY)\b/i);
  let currency = null;
  if (currencyMatch) {
    currency = currencyMatch[1].toUpperCase();
  } else if (text.includes('$')) {
    currency = 'USD';
  } else if (text.includes('\u20b9')) {
    currency = 'INR';
  } else if (text.includes('\u20ac')) {
    currency = 'EUR';
  } else if (text.includes('\u00a3')) {
    currency = 'GBP';
  }

  const dateMatch =
    text.match(/\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b/) ||
    text.match(/\b(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})\b/) ||
    text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i);
  let date = null;
  if (dateMatch) {
    const parsed = new Date(dateMatch[0]);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  }

  const vendor = lines.slice(0, 3).find(l => l.length > 2 && !/^\d/.test(l)) || null;

  const typeMap = {
    Meals: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger', 'bar', 'bistro'],
    Travel: ['taxi', 'uber', 'lyft', 'airline', 'flight', 'train', 'bus', 'fuel', 'petrol', 'parking'],
    Accommodation: ['hotel', 'inn', 'lodge', 'airbnb', 'resort', 'motel'],
    'Office Supplies': ['stationery', 'office', 'supplies', 'printer', 'ink', 'paper'],
    Training: ['course', 'training', 'seminar', 'workshop', 'conference'],
  };
  let expenseType = 'Other';
  for (const [type, keywords] of Object.entries(typeMap)) {
    if (keywords.some(kw => lower.includes(kw))) { expenseType = type; break; }
  }

  const expenseLines = [];
  const lineRegex = /^(.{2,40}?)\s{2,}(\d{1,5}[.,]\d{2})$/;
  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) expenseLines.push({ description: match[1].trim(), amount: parseFloat(match[2].replace(',', '')) });
  }

  const description = expenseLines.length > 0
    ? expenseLines.map(l => l.description).join(', ')
    : lines.slice(0, 5).join(' ').substring(0, 200);

  return { amount, currency, date, vendor, expenseType, description, expenseLines };
};

export default function SubmitExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const { company } = useAuth();
  const [form, setForm] = useState({ category: '', currency: 'USD', date: '', description: '', vendor: '' });
  const [lines, setLines] = useState([emptyLine()]);
  const [currencies, setCurrencies] = useState([]);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (company?.defaultCurrency) {
      setForm(prev => ({ ...prev, currency: company.defaultCurrency }));
    }
  }, [company]);

  useEffect(() => {
    if (!draftId) return;
    api.get(`/expenses/${draftId}`).then(res => {
      const e = res.data;
      setForm({ category: e.category || '', currency: e.currency || 'USD', date: e.date ? e.date.split('T')[0] : '', description: e.description || '', vendor: e.ocrData?.vendor || '' });
      if (e.ocrData?.expenseLines?.length > 0) {
        setLines(e.ocrData.expenseLines.map(l => ({ description: l.description, quantity: l.quantity || 1, unitPrice: l.unitPrice || l.amount, amount: l.amount })));
      }
    });
  }, [draftId]);

  useEffect(() => {
    axios.get('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => {
        const seen = new Set();
        const list = [];
        res.data.forEach(c => {
          if (!c.currencies) return;
          Object.entries(c.currencies).forEach(([code, info]) => {
            if (!seen.has(code)) { seen.add(code); list.push({ code, label: `${code} — ${info.name || code}` }); }
          });
        });
        list.sort((a, b) => a.code.localeCompare(b.code));
        setCurrencies(list);
      })
      .catch(() => setCurrencies([
        { code: 'USD', label: 'USD — US Dollar' }, { code: 'INR', label: 'INR — Indian Rupee' },
        { code: 'EUR', label: 'EUR — Euro' }, { code: 'GBP', label: 'GBP — British Pound' },
        { code: 'AED', label: 'AED — UAE Dirham' },
      ]))
      .finally(() => setCurrencyLoading(false));
  }, []);

  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const updateLine = (i, key, val) => {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      const n = { ...l, [key]: val };
      if (key === 'quantity' || key === 'unitPrice') n.amount = (parseFloat(n.quantity) || 0) * (parseFloat(n.unitPrice) || 0);
      return n;
    }));
  };

  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = i => setLines(lines.filter((_, idx) => idx !== i));

  const openCamera = async () => {
    setCameraError(''); setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError('Camera access denied. Please allow camera permission.');
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setReceipt(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      setScanned(false);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleScan = async () => {
    if (!receipt) return;
    setScanning(true); setError('');
    try {
      const { data: { text } } = await Tesseract.recognize(receipt, 'eng', { logger: () => {} });
      const ocr = extractOcrFields(text);
      setForm(p => ({
        ...p,
        category: ocr.expenseType || p.category,
        currency: ocr.currency || p.currency,
        date: ocr.date || p.date,
        description: ocr.description || p.description,
        vendor: ocr.vendor || p.vendor,
      }));
      if (ocr.expenseLines?.length > 0) {
        setLines(ocr.expenseLines.map(l => ({ description: l.description, quantity: 1, unitPrice: l.amount, amount: l.amount })));
      } else if (ocr.amount) {
        setLines([{ description: ocr.vendor || 'Expense', quantity: 1, unitPrice: ocr.amount, amount: ocr.amount }]);
      }
      setScanned(true);
    } catch (err) {
      setError('OCR scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (draftId) {
        await api.post(`/expenses/${draftId}/submit`);
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        data.append('amount', totalAmount.toFixed(2));
        data.append('ocrData', JSON.stringify({ vendor: form.vendor, expenseLines: lines }));
        if (receipt) data.append('receipt', receipt);
        await api.post('/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    setError(''); setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('amount', totalAmount.toFixed(2));
      data.append('ocrData', JSON.stringify({ vendor: form.vendor, expenseLines: lines }));
      if (draftId) data.append('draftId', draftId);
      if (receipt) data.append('receipt', receipt);
      await api.post('/expenses/draft', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally { setLoading(false); }
  };

  const set = key => e => setForm({ ...form, [key]: e.target.value });

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.titleRow}>
          <h2 style={{ margin: 0 }}>Submit Expense</h2>
          <div style={s.scanArea}>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" id="receiptFile" style={{ display: 'none' }}
              onChange={e => { setReceipt(e.target.files[0]); setScanned(false); }} />
            <label htmlFor="receiptFile" style={s.btnUpload}>
              📎 {receipt ? receipt.name.substring(0, 18) + (receipt.name.length > 18 ? '...' : '') : 'Attach Receipt'}
            </label>
            <button type="button" style={{ ...s.btnUpload, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }} onClick={openCamera}>
              📷 Camera
            </button>
            <button type="button" style={{ ...s.btnScan, opacity: (!receipt || scanning) ? 0.6 : 1 }}
              onClick={handleScan} disabled={!receipt || scanning}>
              {scanning ? '⏳ Scanning...' : '🔍 Scan & Auto-fill'}
            </button>
            {scanned && <span style={s.badge}>✓ Auto-filled</span>}
          </div>
        </div>

        {scanning && (
          <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#0c4a6e' }}>
            ⏳ Reading receipt with OCR... this may take 10–20 seconds.
          </div>
        )}

        {showCamera && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1f2937', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#fff', margin: 0 }}>📷 Capture Receipt</h3>
                <button onClick={closeCamera} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer' }}>✕</button>
              </div>
              {cameraError
                ? <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 8 }}>{cameraError}</div>
                : <>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 320, objectFit: 'cover' }} />
                    <button onClick={capturePhoto} style={{ width: '100%', marginTop: '1rem', padding: '0.85rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                      📸 Capture Photo
                    </button>
                  </>
              }
            </div>
          </div>
        )}

        {error && <p style={s.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <div style={s.field}><label style={s.label}>Vendor / Merchant</label><input style={s.input} placeholder="e.g. McDonald's" value={form.vendor} onChange={set('vendor')} /></div>
            <div style={s.field}><label style={s.label}>Expense Type *</label>
              <select style={s.input} required value={form.category} onChange={set('category')}>
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Currency *</label>
              <select style={s.input} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {currencyLoading ? <option>Loading...</option> : currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Date *</label><input style={s.input} type="date" required value={form.date} onChange={set('date')} /></div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, height: '60px', resize: 'vertical' }} placeholder="What was this expense for?" value={form.description} onChange={set('description')} />
          </div>

          <div style={s.tableSection}>
            <div style={s.tableHeader}>
              <span style={{ fontWeight: 700 }}>Expense Lines</span>
              <button type="button" style={s.btnAddLine} onClick={addLine}>+ Add Line</button>
            </div>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Item / Description</th>
                  <th style={{ ...s.th, width: '80px' }}>Qty</th>
                  <th style={{ ...s.th, width: '110px' }}>Unit Price</th>
                  <th style={{ ...s.th, width: '110px' }}>Amount</th>
                  <th style={{ ...s.th, width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td style={s.td}><input style={s.cellInput} placeholder="Item description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                    <td style={s.td}><input style={s.cellInput} type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} /></td>
                    <td style={s.td}><input style={s.cellInput} type="number" step="0.01" placeholder="0.00" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} /></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{(parseFloat(line.amount) || 0).toFixed(2)}</td>
                    <td style={s.td}>{lines.length > 1 && <button type="button" style={s.btnRemove} onClick={() => removeLine(i)}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.totalRow}>
              <span>Total Amount</span>
              <span style={s.totalAmount}>{form.currency} {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div style={s.actions}>
            <button type="button" style={s.btnCancel} onClick={() => navigate('/employee')}>Cancel</button>
            <button type="button" style={s.btnDraft} disabled={loading} onClick={handleSaveDraft}>💾 Save Draft</button>
            <button type="submit" style={s.btnSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  card: { maxWidth: '860px', margin: '0 auto', background: '#fff', borderRadius: '10px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  scanArea: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  btnUpload: { padding: '0.4rem 0.9rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  btnScan: { padding: '0.4rem 0.9rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  badge: { background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 },
  error: { color: '#dc2626', background: '#fee2e2', padding: '0.6rem 1rem', borderRadius: '6px', marginBottom: '1rem' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' },
  input: { padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  tableSection: { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  btnAddLine: { padding: '0.3rem 0.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f9fafb' },
  th: { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '0.4rem 0.75rem', borderBottom: '1px solid #f3f4f6' },
  cellInput: { width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.88rem', boxSizing: 'border-box' },
  btnRemove: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f9fafb', fontWeight: 600 },
  totalAmount: { fontSize: '1.1rem', color: '#4f46e5' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  btnCancel: { padding: '0.6rem 1.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnDraft: { padding: '0.6rem 1.5rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSubmit: { padding: '0.6rem 1.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
};
