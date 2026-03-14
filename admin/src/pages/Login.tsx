import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/shared/Button';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 w-full max-w-[320px]"
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-slate-900 text-xl">🌾</span>
          <h1 className="text-xl font-bold text-slate-900">Kweka Jeeto Admin</h1>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoFocus
          />
        </div>
        {error && <p className="text-base text-red-500 mb-4">{error}</p>}
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </div>
  );
}
