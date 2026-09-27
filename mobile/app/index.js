import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (!isProfileComplete) {
      return <Redirect href="/(auth)/login" />;
    }
    return <Redirect href="/(main)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
