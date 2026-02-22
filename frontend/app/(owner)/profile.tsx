import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { resetAllStock } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const handleResetStock = async () => {
    // Use window.confirm for web since Alert.alert doesn't work well on web
    const confirmMessage = 'This will set ALL stock quantities to ZERO.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?';
    
    let confirmed = false;
    
    if (Platform.OS === 'web') {
      confirmed = window.confirm(confirmMessage);
    } else {
      // For native, use Alert.alert with a promise wrapper
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          '⚠️ Reset All Stock',
          confirmMessage,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Yes, Reset Everything', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (confirmed) {
      setResetting(true);
      try {
        await resetAllStock();
        if (Platform.OS === 'web') {
          window.alert('Success! All stock has been reset to zero.');
        } else {
          Alert.alert('Success', 'All stock has been reset to zero');
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || 'Failed to reset stock';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      } finally {
        setResetting(false);
      }
    }
  };

  const handleEditStock = () => {
    router.push('/(owner)/edit-stock' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color="#007AFF" />
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'owner' ? 'Owner / Sales' : 'Factory Manager'}
            </Text>
          </View>
        </View>

        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          
          <TouchableOpacity style={styles.adminButton} onPress={handleEditStock}>
            <Ionicons name="create-outline" size={24} color="#007AFF" />
            <View style={styles.adminButtonContent}>
              <Text style={styles.adminButtonText}>Edit Stock Manually</Text>
              <Text style={styles.adminButtonSubtext}>Adjust any stock quantity</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.adminButton, styles.dangerButton, resetting && styles.disabledButton]} 
            onPress={handleResetStock}
            disabled={resetting}
          >
            <Ionicons name="trash-outline" size={24} color={resetting ? "#999" : "#FF3B30"} />
            <View style={styles.adminButtonContent}>
              <Text style={[styles.adminButtonText, styles.dangerText, resetting && styles.disabledText]}>
                {resetting ? 'Resetting...' : 'Reset All Stock to Zero'}
              </Text>
              <Text style={styles.adminButtonSubtext}>⚠️ This cannot be undone</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={resetting ? "#999" : "#FF3B30"} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  adminSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 4,
  },
  adminButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  adminButtonSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  dangerText: {
    color: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});
