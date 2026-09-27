import React from 'react';
import RegisterForm from '../features/auth/components/RegisterForm';
import ThemeToggle from '../features/theme/components/ThemeToggle';
import LanguageSwitcher from '../features/i18n/LanguageSwitcher';

const RegisterPage = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;
