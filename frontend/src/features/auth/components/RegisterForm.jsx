import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Loader2, WifiOff } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const { register, loading, error, clearError } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/dashboard');
    } catch {
      // Error handled by context
    }
  };

  // Field descriptors are static literals so Tailwind can see the class names —
  // and the labels come from the dictionary, not from a hardcoded table.
  const FIELDS = [
    { id: 'fullName', key: 'register.fullName', type: 'text', autoComplete: 'name', placeholder: 'register.fullNamePlaceholder', Icon: User },
    { id: 'email', key: 'register.email', type: 'email', autoComplete: 'email', placeholder: 'register.emailPlaceholder', Icon: Mail },
    { id: 'password', key: 'register.password', type: 'password', autoComplete: 'new-password', placeholder: 'register.passwordPlaceholder', Icon: Lock },
  ];

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('register.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div aria-live="polite">
          {(() => {
            // Same split as LoginForm: a down API is not a rejected form.
            const unreachable = !!error && !error.response && (error.code === 'ECONNABORTED' || !error.message);
            const serviceDown = !!error && error.response?.status === 503;
            if (unreachable || serviceDown) {
              return (
                <div className="glass mb-4 rounded-ui-sm border-warning/50 p-4 text-sm text-on-warning-subtle">
                  <p className="flex items-center gap-2 font-bold">
                    <WifiOff size={16} aria-hidden="true" /> {t('login.serviceDown')}
                  </p>
                  <p className="mt-1">{t('login.serviceDownHelp')}</p>
                </div>
              );
            }
            if (!error) return null;
            return (
              <div className="glass mb-4 rounded-ui-sm border-emergency/50 p-3 text-sm text-on-emergency-subtle">
                {error.response?.data?.message || t('login.failed')}
              </div>
            );
          })()}
        </div>

        {FIELDS.map(({ id, key, type, autoComplete, placeholder, Icon }) => (
          <div key={id}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-muted">{t(key)}</label>
            <div className="relative">
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-ink-subtle">
                <Icon size={18} />
              </div>
              <input
                id={id}
                name={id}
                type={type}
                autoComplete={autoComplete}
                required
                value={formData[id]}
                onChange={handleChange}
                className="block w-full rounded-ui-sm border border-line-strong bg-surface/70 py-2 ps-10 pe-3 text-ink backdrop-blur-xl transition-all placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
                placeholder={t(placeholder)}
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="brand-gradient flex w-full items-center justify-center rounded-ui-sm px-4 py-3 font-bold text-white shadow-card-hover transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="me-2 animate-spin" size={20} aria-hidden="true" />
          ) : (
            <UserPlus className="me-2" size={20} aria-hidden="true" />
          )}
          {loading ? t('register.submitting') : t('register.submit')}
        </button>

        <p className="text-center text-sm text-ink-muted">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="rounded-ui-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover">
            {t('register.signin')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterForm;
