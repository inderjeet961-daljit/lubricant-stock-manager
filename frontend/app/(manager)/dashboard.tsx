import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  getFinishedProducts,
  getLooseOils,
  getRawMaterials,
  getPackingMaterials,
  getPendingReturns,
} from '../../services/api';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [looseOils, setLooseOils] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [products, oils, raw, packing, returns] = await Promise.all([
        getFinishedProducts(),
        getLooseOils(),
        getRawMaterials(),
        getPackingMaterials(),
        getPendingReturns(),
      ]);
      
      setFinishedProducts(products);
      setLooseOils(oils);
      setRawMaterials(raw);
      setPackingMaterials(packing);
      setPendingReturns(returns);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Factory Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.name}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Returns Alert */}
        {pendingReturns.length > 0 && (
          <View style={styles.alertBox}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.alertText}>
              {pendingReturns.length} return{pendingReturns.length > 1 ? 's' : ''} pending your approval!
            </Text>
          </View>
        )}

        {/* Factory Stock Summary */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="stats-chart" size={20} color="#007AFF" />
            <Text style={styles.blockTitle}>Factory Stock Overview</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {finishedProducts.reduce((sum, p) => sum + p.factory_stock, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Finished Goods</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {looseOils.reduce((sum, o) => sum + o.stock_litres, 0).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Loose Oil (L)</Text>
            </View>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {rawMaterials.reduce((sum, m) => sum + m.stock, 0).toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Raw Materials</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {packingMaterials.reduce((sum, p) => sum + p.stock, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Packing (pcs)</Text>
            </View>
          </View>
        </View>

        {/* Finished Goods - Factory Stock Only */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="cube" size={20} color="#007AFF" />
            <Text style={styles.blockTitle}>Finished Goods (Factory)</Text>
          </View>
          
          {finishedProducts.map((product) => (
            <View key={product.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{product.name} ({product.pack_size})</Text>
              <Text style={styles.itemValue}>{product.factory_stock} pcs</Text>
            </View>
          ))}
          
          {finishedProducts.length === 0 && (
            <Text style={styles.emptyText}>No finished products yet</Text>
          )}
        </View>

        {/* Loose Oils */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="water" size={20} color="#007AFF" />
            <Text style={styles.blockTitle}>Loose Oil Stock (Litres)</Text>
          </View>
          
          {looseOils.map((oil) => (
            <View key={oil.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{oil.name}</Text>
              <Text style={styles.itemValue}>{oil.stock_litres.toFixed(2)} L</Text>
            </View>
          ))}
          
          {looseOils.length === 0 && (
            <Text style={styles.emptyText}>No loose oils yet</Text>
          )}
        </View>

        {/* Raw Materials */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="flask" size={20} color="#007AFF" />
            <Text style={styles.blockTitle}>Raw Materials</Text>
          </View>
          
          {rawMaterials.map((material) => (
            <View key={material.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{material.name}</Text>
              <Text style={styles.itemValue}>{material.stock.toFixed(2)} {material.unit}</Text>
            </View>
          ))}
          
          {rawMaterials.length === 0 && (
            <Text style={styles.emptyText}>No raw materials yet</Text>
          )}
        </View>

        {/* Packing Materials */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Ionicons name="albums" size={20} color="#007AFF" />
            <Text style={styles.blockTitle}>Packing Materials</Text>
          </View>
          
          {packingMaterials.map((packing) => (
            <View key={packing.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{packing.name}</Text>
              <Text style={styles.itemValue}>{packing.stock} pcs</Text>
            </View>
          ))}
          
          {packingMaterials.length === 0 && (
            <Text style={styles.emptyText}>No packing materials yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  block: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
