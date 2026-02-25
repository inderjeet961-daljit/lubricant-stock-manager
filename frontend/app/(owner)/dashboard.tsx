import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
  searchStock,
} from '../../services/api';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [looseOils, setLooseOils] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      handleSearch();
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

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

  const handleSearch = async () => {
    try {
      const results = await searchStock(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.name}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search product, loose oil, raw material, or pack..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {searchResults ? (
          // Search Results
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>Search Results</Text>
            
            {searchResults.finished_goods?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Finished Goods</Text>
                {searchResults.finished_goods.map((item) => (
                  <View key={item.id} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name} ({item.pack_size})</Text>
                    <View style={styles.resultItemStocks}>
                      <Text style={styles.resultItemStock}>Factory: {item.factory_stock}</Text>
                      <Text style={styles.resultItemStock}>Car: {item.car_stock}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {searchResults.loose_oils?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Loose Oils</Text>
                {searchResults.loose_oils.map((item) => (
                  <View key={item.id} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemStock}>{item.stock_litres.toFixed(2)} L</Text>
                  </View>
                ))}
              </View>
            )}
            
            {searchResults.raw_materials?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Raw Materials</Text>
                {searchResults.raw_materials.map((item) => (
                  <View key={item.id} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemStock}>{item.stock.toFixed(2)} {item.unit}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {searchResults.packing_materials?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Packing Materials</Text>
                {searchResults.packing_materials.map((item) => (
                  <View key={item.id} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemStock}>{item.stock} pcs</Text>
                  </View>
                ))}
              </View>
            )}
            
            {!searchResults.finished_goods?.length &&
              !searchResults.loose_oils?.length &&
              !searchResults.raw_materials?.length &&
              !searchResults.packing_materials?.length && (
                <Text style={styles.noResults}>No results found</Text>
              )}
          </View>
        ) : (
          // Dashboard Content
          <>
            {/* Pending Returns Alert */}
            {pendingReturns.length > 0 && (
              <View style={styles.alertBox}>
                <Ionicons name="warning" size={20} color="#FF9500" />
                <Text style={styles.alertText}>
                  {pendingReturns.length} pending return{pendingReturns.length > 1 ? 's' : ''} awaiting approval
                </Text>
              </View>
            )}

            {/* Block 1: Finished Goods */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Ionicons name="cube" size={20} color="#007AFF" />
                <Text style={styles.blockTitle}>Finished Goods (Pieces)</Text>
              </View>
              
              <View style={styles.stockRow}>
                <View style={[styles.stockColumn, { flex: 2 }]}>
                  <Text style={styles.columnHeader}>Product</Text>
                </View>
                <View style={styles.stockColumn}>
                  <Text style={styles.columnHeader}>Factory</Text>
                </View>
                <View style={styles.stockColumn}>
                  <Text style={styles.columnHeader}>Car</Text>
                </View>
                <View style={styles.stockColumn}>
                  <Text style={styles.columnHeader}>Cartons</Text>
                </View>
              </View>
              
              {finishedProducts.map((product) => (
                <View key={product.id} style={styles.stockRow}>
                  <View style={[styles.stockColumn, { flex: 2 }]}>
                    <Text style={styles.productName}>{product.name} ({product.pack_size})</Text>
                  </View>
                  <View style={styles.stockColumn}>
                    <Text style={styles.stockValue}>{product.factory_stock}</Text>
                  </View>
                  <View style={styles.stockColumn}>
                    <Text style={styles.stockValue}>{product.car_stock}</Text>
                  </View>
                  <View style={styles.stockColumn}>
                    <Text style={[styles.stockValue, { color: '#E91E63' }]}>{product.carton_stock || 0}</Text>
                  </View>
                </View>
              ))}
              
              {finishedProducts.length === 0 && (
                <Text style={styles.emptyText}>No finished products yet</Text>
              )}
            </View>

            {/* Block 2: Loose Oil Stock */}
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

            {/* Block 3: Raw Material Stock */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Ionicons name="flask" size={20} color="#007AFF" />
                <Text style={styles.blockTitle}>Raw Material Stock</Text>
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

            {/* Block 4: Packing Material Stock */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Ionicons name="albums" size={20} color="#007AFF" />
                <Text style={styles.blockTitle}>Packing Material Stock (Pieces)</Text>
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
          </>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9500',
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
  stockRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stockColumn: {
    flex: 1,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 16,
  },
  searchResultsContainer: {
    paddingHorizontal: 16,
  },
  searchResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  resultSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultItemName: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  resultItemStocks: {
    flexDirection: 'row',
    gap: 16,
  },
  resultItemStock: {
    fontSize: 14,
    color: '#8E8E93',
  },
  noResults: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 32,
  },
});
