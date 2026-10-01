import React from 'react';
import LoginForm from '../features/auth/components/LoginForm';
import AuthShell from '../components/ui/auth-shell';

const LoginPage = () => {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
};

export default LoginPage;
