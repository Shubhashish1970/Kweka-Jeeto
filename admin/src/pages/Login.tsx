import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(password);
      navigate('/dashboard');
    } catch {
      setError('Invalid password');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          width: 320,
        }}
      >
        <h1 style={{ marginBottom: 24, fontSize: 24 }}>🌾 Kweka Jeeto Admin</h1>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
            autoFocus
          />
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: 10,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
