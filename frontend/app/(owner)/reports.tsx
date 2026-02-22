import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getWeeklyReport, getDailyReport } from '../../services/api';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [expandedTxn, setExpandedTxn] = useState(null);

  useEffect(() => {
    loadWeeklyReport();
  }, []);

  const loadWeeklyReport = async () => {
    try {
      setLoading(true);
      const report = await getWeeklyReport();
      setWeeklyReport(report);
    } catch (error) {
      console.error('Error loading weekly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReport = async (date: string) => {
    try {
      setSelectedDate(date);
      const report = await getDailyReport(date);
      setDailyReport(report);
    } catch (error) {
      console.error('Error loading daily report:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWeeklyReport();
    if (selectedDate) {
      await loadDailyReport(selectedDate);
    }
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getTypeColor = (type: string) => {
    if (type.includes('add') || type.includes('manufacture') || type.includes('pack')) {
      return '#34C759'; // Green for additions
    }
    if (type.includes('sale') || type.includes('take_stock')) {
      return '#007AFF'; // Blue for sales/movements
    }
    if (type.includes('delete') || type.includes('damaged') || type.includes('reset')) {
      return '#FF3B30'; // Red for deletions/damage
    }
    if (type.includes('return') || type.includes('approve')) {
      return '#FF9500'; // Orange for returns
    }
    return '#8E8E93'; // Gray for others
  };

  const formatTransactionData = (data: any) => {
    if (!data) return [];
    const items = [];
    
    // Common fields
    if (data.product_name) items.push(`Product: ${data.product_name}`);
    if (data.pack_size) items.push(`Pack Size: ${data.pack_size}`);
    if (data.quantity) items.push(`Quantity: ${data.quantity}`);
    if (data.quantity_packed) items.push(`Units Packed: ${data.quantity_packed}`);
    if (data.quantity_litres) items.push(`Litres: ${data.quantity_litres}`);
    if (data.oil_used_litres) items.push(`Oil Used: ${data.oil_used_litres}L`);
    if (data.loose_oil_name) items.push(`Loose Oil: ${data.loose_oil_name}`);
    if (data.raw_material_name) items.push(`Raw Material: ${data.raw_material_name}`);
    if (data.packing_material_name) items.push(`Packing: ${data.packing_material_name}`);
    if (data.sale_type) items.push(`Sale Type: ${data.sale_type}`);
    if (data.reason) items.push(`Reason: ${data.reason}`);
    if (data.name) items.push(`Name: ${data.name}`);
    
    // Stock changes
    if (data.prev_factory_stock !== undefined) items.push(`Prev Factory: ${data.prev_factory_stock}`);
    if (data.prev_car_stock !== undefined) items.push(`Prev Car: ${data.prev_car_stock}`);
    if (data.prev_stock !== undefined) items.push(`Prev Stock: ${data.prev_stock}`);
    if (data.prev_oil_stock !== undefined) items.push(`Prev Oil: ${data.prev_oil_stock}L`);
    
    return items;
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weekly Reports</Text>
        <Text style={styles.headerSubtitle}>Track all activities for accountability</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        {weeklyReport && (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}>
                <Text style={styles.summaryNumber}>{weeklyReport.summary.total_transactions}</Text>
                <Text style={styles.summaryLabel}>Total Entries</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}>
                <Text style={styles.summaryNumber}>{Object.keys(weeklyReport.summary.by_user).length}</Text>
                <Text style={styles.summaryLabel}>Active Users</Text>
              </View>
            </View>

            {/* Activity by User */}
            <Text style={styles.sectionTitle}>Activity by User</Text>
            <View style={styles.userSummary}>
              {Object.entries(weeklyReport.summary.by_user).map(([user, count]) => (
                <View key={user} style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Ionicons name="person-circle" size={32} color="#007AFF" />
                    <Text style={styles.userName}>{user}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count as number} actions</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Daily Breakdown */}
            <Text style={styles.sectionTitle}>Daily Breakdown (Last 7 Days)</Text>
            <View style={styles.daysContainer}>
              {getLast7Days().map((date) => {
                const count = weeklyReport.summary.by_date[date] || 0;
                const isSelected = selectedDate === date;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                    onPress={() => loadDailyReport(date)}
                  >
                    <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                      {formatDate(date)}
                    </Text>
                    <Text style={[styles.dayCount, isSelected && styles.dayTextSelected]}>
                      {count} entries
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Daily Detail */}
            {selectedDate && dailyReport && (
              <>
                <Text style={styles.sectionTitle}>
                  Details for {formatDate(selectedDate)}
                </Text>
                
                {Object.entries(dailyReport.by_user).length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
                    <Text style={styles.emptyDayText}>No activities on this day</Text>
                  </View>
                ) : (
                  Object.entries(dailyReport.by_user).map(([user, transactions]: [string, any]) => (
                    <View key={user} style={styles.userSection}>
                      <View style={styles.userHeader}>
                        <Ionicons name="person" size={20} color="#007AFF" />
                        <Text style={styles.userSectionTitle}>{user}</Text>
                        <Text style={styles.userSectionCount}>({transactions.length} actions)</Text>
                      </View>
                      
                      {transactions.map((txn: any, index: number) => (
                        <TouchableOpacity
                          key={txn.id || index}
                          style={styles.transactionCard}
                          onPress={() => setExpandedTxn(expandedTxn === txn.id ? null : txn.id)}
                        >
                          <View style={styles.txnHeader}>
                            <View style={[styles.txnTypeBadge, { backgroundColor: getTypeColor(txn.type) }]}>
                              <Text style={styles.txnTypeText}>{txn.type_label}</Text>
                            </View>
                            <Text style={styles.txnTime}>{txn.time}</Text>
                          </View>
                          
                          {expandedTxn === txn.id && (
                            <View style={styles.txnDetails}>
                              {formatTransactionData(txn.data).map((item, i) => (
                                <Text key={i} style={styles.txnDetailItem}>• {item}</Text>
                              ))}
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                )}
              </>
            )}

            {/* Transaction Types Summary */}
            <Text style={styles.sectionTitle}>Activity Types This Week</Text>
            <View style={styles.typesSummary}>
              {Object.entries(weeklyReport.summary.by_type).map(([type, count]) => (
                <View key={type} style={styles.typeRow}>
                  <View style={[styles.typeDot, { backgroundColor: getTypeColor(type) }]} />
                  <Text style={styles.typeName}>{type.replace(/_/g, ' ')}</Text>
                  <Text style={styles.typeCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8E8E93', fontSize: 16 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  content: { flex: 1 },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryNumber: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  userSummary: { marginHorizontal: 16 },
  userRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  countBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: { color: '#007AFF', fontWeight: '600', fontSize: 14 },
  daysContainer: { marginHorizontal: 16 },
  dayCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  dayCardSelected: { backgroundColor: '#007AFF' },
  dayName: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  dayCount: { fontSize: 14, color: '#8E8E93' },
  dayTextSelected: { color: '#fff' },
  emptyDay: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyDayText: { marginTop: 12, color: '#8E8E93', fontSize: 16 },
  userSection: { marginHorizontal: 16, marginBottom: 16 },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  userSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  userSectionCount: { fontSize: 14, color: '#8E8E93' },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txnTypeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  txnTime: { fontSize: 13, color: '#8E8E93' },
  txnDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  txnDetailItem: { fontSize: 13, color: '#666', marginBottom: 4 },
  typesSummary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  typeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  typeName: { flex: 1, fontSize: 14, color: '#1a1a1a', textTransform: 'capitalize' },
  typeCount: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
});
