import React from 'react';
import LoginForm from '../features/auth/components/LoginForm';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';

const LoginPage = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
