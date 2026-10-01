import React from 'react';
import RegisterForm from '../features/auth/components/RegisterForm';
import AuthShell from '../components/ui/auth-shell';

const RegisterPage = () => {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
};

export default RegisterPage;
