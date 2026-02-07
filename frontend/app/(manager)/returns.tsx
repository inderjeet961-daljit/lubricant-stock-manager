import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getPendingReturns, approveReturn } from '../../services/api';

export default function ReturnsScreen() {
  const [returns, setReturns] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const data = await getPendingReturns();
      setReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReturns();
  };

  const handleApprove = (returnItem, action) => {
    const actionText = action === 'drain_reuse' ? 'Drain & Reuse' : 'Scrap';
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionText} ${returnItem.quantity} units of ${returnItem.product_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await approveReturn(returnItem.id, action);
              Alert.alert('Success', 'Return approved successfully');
              loadReturns();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to approve return');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Returns</Text>
        <Text style={styles.headerSubtitle}>Approve returns from sales</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {returns.length > 0 ? (
          returns.map((returnItem) => (
            <View key={returnItem.id} style={styles.returnCard}>
              <View style={styles.returnHeader}>
                <View>
                  <Text style={styles.returnProduct}>{returnItem.product_name}</Text>
                  <Text style={styles.returnQuantity}>{returnItem.quantity} units</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Pending</Text>
                </View>
              </View>
              
              <View style={styles.returnMeta}>
                <Text style={styles.returnMetaText}>Created by: {returnItem.created_by}</Text>
                <Text style={styles.returnMetaText}>
                  {new Date(returnItem.created_at).toLocaleString()}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.drainButton]}
                  onPress={() => handleApprove(returnItem, 'drain_reuse')}
                >
                  <Ionicons name="water" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Drain & Reuse</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.scrapButton]}
                  onPress={() => handleApprove(returnItem, 'scrap')}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Scrap</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#34C759" />
            <Text style={styles.emptyText}>No Pending Returns</Text>
            <Text style={styles.emptySubtext}>All returns have been processed</Text>
          </View>
        )}
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
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  returnCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  returnProduct: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  returnQuantity: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  returnMeta: {
    marginBottom: 16,
  },
  returnMetaText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  drainButton: {
    backgroundColor: '#34C759',
  },
  scrapButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
});
