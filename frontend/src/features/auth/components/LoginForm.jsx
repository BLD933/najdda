import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, WifiOff } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // A dead backend and a rejected password are different problems with
  // different fixes. "Invalid email or password" while the API is unreachable
  // sends the patient into a password-reset loop that cannot possibly work.
  // `error` is null until a request fails, hence the explicit guard.
  const unreachable = !!error && !error.response && (error.code === 'ECONNABORTED' || !error.message);
  const serviceDown = !!error && error.response?.status === 503;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      // Return the patient to wherever the guard interrupted them. The guard
      // stashes the path in `state.from` and nothing read it, so a deep link
      // to /chat or /emergency always dropped the patient on the dashboard.
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    } catch {
      // Error handled by context
    }
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div aria-live="polite">
          {(unreachable || serviceDown) && (
            <div className="glass mb-4 rounded-ui-sm border-warning/50 p-4 text-sm text-on-warning-subtle">
              <p className="flex items-center gap-2 font-bold">
                <WifiOff size={16} aria-hidden="true" /> {t('login.serviceDown')}
              </p>
              <p className="mt-1">{t('login.serviceDownHelp')}</p>
            </div>
          )}
          {error && !unreachable && !serviceDown && (
            <div className="glass mb-4 rounded-ui-sm border-emergency/50 p-3 text-sm text-on-emergency-subtle">
              {error.message || t('login.failed')}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-muted">{t('login.email')}</label>
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-ink-subtle">
              <Mail size={18} />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { clearError(); setEmail(e.target.value); }}
              className="block w-full rounded-ui-sm border border-line-strong bg-surface/70 py-2 ps-10 pe-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-muted">{t('login.password')}</label>
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-ink-subtle">
              <Lock size={18} />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { clearError(); setPassword(e.target.value); }}
              className="block w-full rounded-ui-sm border border-line-strong bg-surface/70 py-2 ps-10 pe-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="brand-gradient flex w-full items-center justify-center rounded-ui-sm px-4 py-3 font-bold text-white shadow-card-hover transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="me-2 animate-spin" size={20} aria-hidden="true" />
          ) : (
            <LogIn className="me-2" size={20} aria-hidden="true" />
          )}
          {loading ? t('login.submitting') : t('login.submit')}
        </button>

        <p className="text-center text-sm text-ink-muted">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="rounded-ui-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover">
            {t('login.signup')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
