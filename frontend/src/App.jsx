import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { ThemeProvider } from './features/theme/context/ThemeContext';
import { I18nProvider, useTranslation } from './features/i18n/I18nContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import ChatPage from './pages/ChatPage';
import DomainPage from './pages/DomainPage';
import EmergencyPage from './pages/EmergencyPage';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="sr-only">{t('app.loading')}</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Check if profile is complete (aligné backend 400 + wizard)
  const isProfileComplete = 
    user?.profile?.dateOfBirth && 
    user?.profile?.bloodType && 
    user?.profile?.city &&
    user?.profile?.country &&
    user?.profile?.preferredLanguage &&
    user?.profile?.chronicDiseases &&
    user?.profile?.phoneNumber &&
    user?.profile?.gender &&
    user?.profile?.weight &&
    user?.profile?.height;

  if (!isProfileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas text-ink">
      <h1 className="text-2xl font-bold">{t('app.notFound')}</h1>
      <Link className="underline" to="/dashboard">{t('app.backHome')}</Link>
    </main>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route 
        path="/complete-profile" 
        element={
          <ProtectedRoute>
            <CompleteProfilePage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      {['pregnancy', 'children', 'allergy', 'medications'].map((domain) => (
        <Route
          key={domain}
          path={`/${domain}`}
          element={
            <ProtectedRoute>
              <DomainPage domain={domain} />
            </ProtectedRoute>
          }
        />
      ))}
      <Route
        path="/emergency"
        element={
          <ProtectedRoute>
            <EmergencyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/"
        element={
          loading ? null : isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
