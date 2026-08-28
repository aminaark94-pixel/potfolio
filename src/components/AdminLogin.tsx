import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, Mail } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (isSendingReset) return;
    setIsSendingReset(true);
    setResetMessage(null);

    try {
      const res = await fetch('/api/admin-forgot-password', { method: 'POST' });
      const data = await res.json();

      const sentVia: string[] = [];
      if (data.email?.ok) sentVia.push('Email');
      if (data.whatsapp?.ok) sentVia.push('WhatsApp');
      if (data.sms?.ok) sentVia.push('SMS');

      if (sentVia.length > 0) {
        setResetMessage(`Password sent via ${sentVia.join(' & ')}.`);
      } else {
        const errs = [
          data.email?.error && `Email: ${data.email.error}`,
          data.whatsapp?.error && `WhatsApp: ${data.whatsapp.error}`,
          data.sms?.error && `SMS: ${data.sms.error}`,
        ].filter(Boolean);
        setResetMessage(errs.length ? errs.join(' | ') : 'Could not send password.');
      }
    } catch {
      setResetMessage('Could not reach the server. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-indigo-100 p-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-5">
            <Lock className="w-5 h-5 text-white" />
          </div>

          <h1 className="font-space-grotesk font-bold text-xl text-slate-900 mb-1">
            Studio Hub Access
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter the admin password to continue. This is verified securely on the server.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-space-grotesk font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Verifying...' : 'Unlock Studio Hub'}</span>
            </button>
          </form>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isSendingReset}
            className="w-full mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-space-grotesk font-semibold text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isSendingReset ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5" />
            )}
            <span>{isSendingReset ? 'Sending...' : 'Forgot password?'}</span>
          </button>

          {resetMessage && (
            <p className="text-center text-[11px] text-slate-500 mt-2 leading-relaxed break-words">{resetMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};
