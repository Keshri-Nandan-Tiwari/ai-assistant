import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiError } from '../../api/client';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing or invalid verification link');
      return;
    }
    api
      .post('/api/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'This verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm text-center animate-fadeIn">
        {status === 'verifying' && (
          <>
            <Loader2 size={32} className="animate-spin mx-auto mb-4 text-accent" />
            <h1 className="text-2xl font-semibold mb-1">Verifying your email…</h1>
            <p className="text-neutral-500 text-sm">This will just take a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={32} className="mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-semibold mb-1">Email verified</h1>
            <p className="text-neutral-500 text-sm mb-6">Your account is now active. You can log in.</p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5"
            >
              Log in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={32} className="mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-semibold mb-1">Verification failed</h1>
            <p className="text-neutral-500 text-sm mb-6">{error}</p>
            <Link to="/login" className="text-accent hover:underline text-sm">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
