import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <div className="w-full max-w-md rounded-ui-lg border border-line bg-surface p-8 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div aria-live="polite">
          {error && (
            <div className="mb-4 rounded-ui-sm border border-emergency/40 bg-emergency-subtle p-3 text-sm text-on-emergency-subtle">
              {error}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-muted">{t('login.email')}</label>
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-subtle">
              <Mail size={18} />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-ui-sm border border-line-strong bg-canvas py-2 pl-10 pr-3 text-ink transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-muted">{t('login.password')}</label>
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-subtle">
              <Lock size={18} />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-ui-sm border border-line-strong bg-canvas py-2 pl-10 pr-3 text-ink transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-ui-sm bg-primary px-4 py-3 font-bold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mr-2 animate-spin" size={20} aria-hidden="true" />
          ) : (
            <LogIn className="mr-2" size={20} aria-hidden="true" />
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
