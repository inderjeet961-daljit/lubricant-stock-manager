import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { resetAllStock } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Force reload to clear all state
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            } else {
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  const handleResetStock = () => {
    Alert.alert(
      '⚠️ Reset All Stock',
      'This will set ALL stock quantities to ZERO for:\n\n• Finished Goods (Factory & Car)\n• Loose Oils\n• Raw Materials\n• Packing Materials\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllStock();
              Alert.alert('Success', 'All stock has been reset to zero');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to reset stock');
            }
          },
        },
      ]
    );
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

        {/* Admin Actions */}
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

          <TouchableOpacity style={[styles.adminButton, styles.dangerButton]} onPress={handleResetStock}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <View style={styles.adminButtonContent}>
              <Text style={[styles.adminButtonText, styles.dangerText]}>Reset All Stock to Zero</Text>
              <Text style={styles.adminButtonSubtext}>⚠️ This cannot be undone</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FF3B30" />
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  adminSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  adminButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dangerText: {
    color: '#FF3B30',
  },
  adminButtonSubtext: {
    fontSize: 12,
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});
