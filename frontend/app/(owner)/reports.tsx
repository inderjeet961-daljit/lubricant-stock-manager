import React, { useState, useEffect, useCallback } from 'react';
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
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inject print styles for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'print-report-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            [data-testid="print-report-btn"] { display: none !important; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    loadWeeklyReport();
  }, []);

  const loadWeeklyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const report = await getWeeklyReport();
      setWeeklyReport(report);
    } catch (err: any) {
      console.error('Error loading weekly report:', err);
      setError(err?.response?.data?.detail || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReport = async (date: string) => {
    try {
      setSelectedDate(date);
      const report = await getDailyReport(date);
      setDailyReport(report);
    } catch (err: any) {
      console.error('Error loading daily report:', err);
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

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      // On native, could use expo-print or share
      if (Platform.OS !== 'web') {
        const { Alert } = require('react-native');
        Alert.alert('Print', 'Use the share button to export this report.');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getTypeColor = (type: string) => {
    if (type.includes('add') || type.includes('manufacture') || type.includes('pack')) return '#34C759';
    if (type.includes('sale') || type.includes('take_stock')) return '#007AFF';
    if (type.includes('delete') || type.includes('damaged') || type.includes('reset')) return '#FF3B30';
    if (type.includes('return') || type.includes('approve')) return '#FF9500';
    if (type.includes('edit')) return '#AF52DE';
    return '#8E8E93';
  };

  const getTypeIcon = (type: string): string => {
    if (type.includes('manufacture')) return 'flask';
    if (type.includes('pack')) return 'cube';
    if (type.includes('sale')) return 'cart';
    if (type.includes('add')) return 'add-circle';
    if (type.includes('take_stock')) return 'car';
    if (type.includes('return')) return 'arrow-undo';
    if (type.includes('approve')) return 'checkmark-circle';
    if (type.includes('delete')) return 'trash';
    if (type.includes('edit')) return 'pencil';
    if (type.includes('reset')) return 'refresh';
    if (type.includes('damaged')) return 'warning';
    return 'document';
  };

  const formatTransactionData = (data: any) => {
    if (!data) return [];
    const items: string[] = [];
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
    if (data.prev_factory_stock !== undefined) items.push(`Prev Factory: ${data.prev_factory_stock}`);
    if (data.prev_car_stock !== undefined) items.push(`Prev Car: ${data.prev_car_stock}`);
    if (data.prev_stock !== undefined) items.push(`Prev Stock: ${data.prev_stock}`);
    if (data.prev_oil_stock !== undefined) items.push(`Prev Oil: ${data.prev_oil_stock}L`);
    return items;
  };

  const getLast7Days = () => {
    const days: string[] = [];
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

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={[styles.loadingText, { color: '#FF3B30' }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadWeeklyReport}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      {/* Header with Print Button */}
      <View style={styles.header} data-testid="reports-header">
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Weekly Reports</Text>
          <Text style={styles.headerSubtitle}>Daily activity log for accountability</Text>
        </View>
        <TouchableOpacity 
          style={styles.printBtn} 
          onPress={handlePrint}
          data-testid="print-report-btn"
        >
          <Ionicons name="print" size={20} color="#fff" />
          <Text style={styles.printBtnText}>Print</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {weeklyReport && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryRow} data-testid="report-summary">
              <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="documents" size={24} color="#fff" />
                <Text style={styles.summaryNumber}>{weeklyReport.summary.total_transactions}</Text>
                <Text style={styles.summaryLabel}>Total Entries</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}>
                <Ionicons name="people" size={24} color="#fff" />
                <Text style={styles.summaryNumber}>{Object.keys(weeklyReport.summary.by_user).length}</Text>
                <Text style={styles.summaryLabel}>Active Users</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="calendar" size={24} color="#fff" />
                <Text style={styles.summaryNumber}>{Object.keys(weeklyReport.summary.by_date).length}</Text>
                <Text style={styles.summaryLabel}>Active Days</Text>
              </View>
            </View>

            {/* Activity by User */}
            <Text style={styles.sectionTitle}>Activity by User</Text>
            <View style={styles.userSummary}>
              {Object.entries(weeklyReport.summary.by_user).map(([user, count]) => (
                <View key={user} style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Ionicons name="person-circle" size={28} color="#007AFF" />
                    <Text style={styles.userName}>{user}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count as number} actions</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Day-by-Day Breakdown */}
            <Text style={styles.sectionTitle}>Day-by-Day Breakdown</Text>
            <Text style={styles.sectionHint}>Tap a day to see detailed activities</Text>
            
            <View style={styles.daysContainer}>
              {getLast7Days().map((date) => {
                const count = weeklyReport.summary.by_date[date] || 0;
                const isSelected = selectedDate === date;
                const isToday = date === new Date().toISOString().split('T')[0];
                return (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.dayCard, 
                      isSelected && styles.dayCardSelected,
                      count === 0 && styles.dayCardEmpty
                    ]}
                    onPress={() => loadDailyReport(date)}
                    data-testid={`day-card-${date}`}
                  >
                    <View style={styles.dayLeft}>
                      <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                        {formatDate(date)} {isToday ? '(Today)' : ''}
                      </Text>
                    </View>
                    <View style={[
                      styles.dayCountBadge,
                      count > 0 ? styles.dayCountActive : styles.dayCountZero,
                      isSelected && styles.dayCountSelected
                    ]}>
                      <Text style={[
                        styles.dayCountText,
                        isSelected && styles.dayTextSelected,
                        count === 0 && !isSelected && { color: '#C7C7CC' }
                      ]}>
                        {count} {count === 1 ? 'entry' : 'entries'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Daily Detail View */}
            {selectedDate && dailyReport && (
              <View style={styles.dailyDetail} data-testid="daily-detail">
                <View style={styles.dailyHeader}>
                  <Text style={styles.dailyTitle}>{formatFullDate(selectedDate)}</Text>
                  <Text style={styles.dailySubtitle}>{dailyReport.total_transactions} total activities</Text>
                </View>
                
                {Object.entries(dailyReport.by_user).length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
                    <Text style={styles.emptyDayText}>No activities on this day</Text>
                  </View>
                ) : (
                  Object.entries(dailyReport.by_user).map(([user, transactions]: [string, any]) => (
                    <View key={user} style={styles.userSection}>
                      <View style={styles.userSectionHeader}>
                        <Ionicons name="person" size={18} color="#007AFF" />
                        <Text style={styles.userSectionTitle}>{user}</Text>
                        <View style={styles.userActionCount}>
                          <Text style={styles.userActionCountText}>{transactions.length}</Text>
                        </View>
                      </View>
                      
                      {transactions.map((txn: any, index: number) => {
                        const txnId = txn.id || `${user}-${index}`;
                        const isExpanded = expandedTxn === txnId;
                        return (
                          <TouchableOpacity
                            key={txnId}
                            style={styles.transactionCard}
                            onPress={() => setExpandedTxn(isExpanded ? null : txnId)}
                            data-testid={`txn-card-${txnId}`}
                          >
                            <View style={styles.txnRow}>
                              <View style={[styles.txnIconWrap, { backgroundColor: getTypeColor(txn.type) + '20' }]}>
                                <Ionicons 
                                  name={getTypeIcon(txn.type) as any} 
                                  size={16} 
                                  color={getTypeColor(txn.type)} 
                                />
                              </View>
                              <View style={styles.txnInfo}>
                                <Text style={styles.txnLabel}>{txn.type_label}</Text>
                                <Text style={styles.txnTime}>{txn.time}</Text>
                              </View>
                              <Ionicons 
                                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                                size={16} 
                                color="#C7C7CC" 
                              />
                            </View>
                            
                            {isExpanded && (
                              <View style={styles.txnDetails}>
                                {formatTransactionData(txn.data).map((item, i) => (
                                  <Text key={i} style={styles.txnDetailItem}>{item}</Text>
                                ))}
                                {formatTransactionData(txn.data).length === 0 && (
                                  <Text style={styles.txnDetailItem}>No additional details</Text>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Activity Types Summary */}
            <Text style={styles.sectionTitle}>Activity Types This Week</Text>
            <View style={styles.typesSummary}>
              {Object.entries(weeklyReport.summary.by_type)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                <View key={type} style={styles.typeRow}>
                  <View style={[styles.typeDot, { backgroundColor: getTypeColor(type) }]} />
                  <Text style={styles.typeName}>{type.replace(/_/g, ' ')}</Text>
                  <Text style={styles.typeCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {weeklyReport && weeklyReport.summary.total_transactions === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateTitle}>No Activity This Week</Text>
            <Text style={styles.emptyStateText}>Transactions from the last 7 days will appear here</Text>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#8E8E93', fontSize: 16, marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  printBtn: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  printBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  content: { flex: 1 },
  
  // Summary
  summaryRow: { flexDirection: 'row', padding: 16, gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 12, color: '#fff', opacity: 0.9 },
  
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  
  // Users
  userSummary: { marginHorizontal: 16, marginTop: 8 },
  userRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  countBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  countText: { color: '#007AFF', fontWeight: '600', fontSize: 13 },
  
  // Days
  daysContainer: { marginHorizontal: 16 },
  dayCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  dayCardSelected: { backgroundColor: '#007AFF' },
  dayCardEmpty: { opacity: 0.7 },
  dayLeft: { flex: 1 },
  dayName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  dayTextSelected: { color: '#fff' },
  dayCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayCountActive: { backgroundColor: '#E8F5E9' },
  dayCountZero: { backgroundColor: '#F5F5F5' },
  dayCountSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayCountText: { fontSize: 13, fontWeight: '500', color: '#34C759' },
  
  // Daily Detail
  dailyDetail: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dailyHeader: {
    backgroundColor: '#F8F8FA',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dailyTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  dailySubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  
  emptyDay: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyDayText: { color: '#C7C7CC', fontSize: 15 },
  
  // User Section in Daily
  userSection: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  userSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FAFAFA',
  },
  userSectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  userActionCount: {
    backgroundColor: '#007AFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userActionCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  // Transaction Card
  transactionCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  txnTime: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  txnDetails: {
    marginTop: 8,
    marginLeft: 42,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  txnDetailItem: { fontSize: 13, color: '#666', marginBottom: 3 },
  
  // Types
  typesSummary: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  typeName: { flex: 1, fontSize: 13, color: '#1a1a1a', textTransform: 'capitalize' },
  typeCount: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  emptyStateText: { fontSize: 14, color: '#C7C7CC' },
});
