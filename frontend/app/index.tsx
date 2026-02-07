import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Index useEffect - loading:', loading, 'user:', user);
    if (!loading) {
      if (user) {
        console.log('User exists, navigating to dashboard for role:', user.role);
        // Redirect based on role
        if (user.role === 'owner') {
          router.replace('/(owner)/dashboard');
        } else {
          router.replace('/(manager)/dashboard');
        }
      } else {
        console.log('No user, navigating to login');
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
