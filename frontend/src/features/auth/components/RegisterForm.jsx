import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const { register, loading, error } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
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
    <div className="w-full max-w-md rounded-ui-lg border border-line bg-surface p-8 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('register.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div aria-live="polite">
          {error && (
            <div className="mb-4 rounded-ui-sm border border-emergency/40 bg-emergency-subtle p-3 text-sm text-on-emergency-subtle">
              {error}
            </div>
          )}
        </div>

        {FIELDS.map(({ id, key, type, autoComplete, placeholder, Icon }) => (
          <div key={id}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-muted">{t(key)}</label>
            <div className="relative">
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-subtle">
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
                className="block w-full rounded-ui-sm border border-line-strong bg-canvas py-2 pl-10 pr-3 text-ink transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:outline-none"
                placeholder={t(placeholder)}
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-ui-sm bg-primary px-4 py-3 font-bold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mr-2 animate-spin" size={20} aria-hidden="true" />
          ) : (
            <UserPlus className="mr-2" size={20} aria-hidden="true" />
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
