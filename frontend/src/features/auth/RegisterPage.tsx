import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { api, ApiError } from '../../api/client';

function strength(pw: string) {
  const checks = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(pw) },
    { label: 'One number', pass: /[0-9]/.test(pw) },
  ];
  return { checks, score: checks.filter((c) => c.pass).length };
}

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { checks, score } = strength(form.password);
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
        acceptedTerms: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="max-w-sm text-center animate-fadeIn">
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-neutral-500 text-sm mb-6">
            We sent a verification link to <span className="font-medium">{form.email}</span>. Click it to activate your account.
          </p>
          <Link to="/login" className="text-accent hover:underline text-sm">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm animate-fadeIn">
        <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
        <p className="text-neutral-500 text-sm mb-6">Start your first conversation in seconds.</p>

        {error && (
          <div role="alert" className="mb-4 text-sm bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              placeholder="Last name"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <input
            placeholder="Username"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-accent"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {form.password && (
            <div className="space-y-1.5">
              <div className="flex gap-1 h-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`flex-1 rounded-full ${i < score ? barColors[score - 1] : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-2 text-xs text-neutral-500">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-1">
                    {c.pass ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-neutral-400" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            required
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />

          <label className="flex items-start gap-2 text-xs text-neutral-500 pt-1">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5" />
            I agree to the Terms of Service and Privacy Policy
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium py-2.5 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
