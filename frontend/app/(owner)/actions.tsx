import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Picker,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  getFinishedProducts,
  takeStockInCar,
  recordSale,
  returnToFactory,
} from '../../services/api';

export default function OwnerActionsScreen() {
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saleType, setSaleType] = useState('car');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const products = await getFinishedProducts();
      setFinishedProducts(products);
      if (products.length > 0) {
        setSelectedProduct(products[0].name);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const openModal = (action) => {
    setCurrentAction(action);
    setQuantity('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentAction(null);
    setQuantity('');
  };

  const handleAction = async () => {
    if (!selectedProduct || !quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const qty = parseInt(quantity);
      
      if (currentAction === 'take_stock') {
        await takeStockInCar(selectedProduct, qty);
        Alert.alert('Success', `Moved ${qty} units to car`);
      } else if (currentAction === 'record_sale') {
        await recordSale(selectedProduct, qty, saleType);
        Alert.alert('Success', `Sale recorded: ${qty} units via ${saleType}`);
      } else if (currentAction === 'return') {
        await returnToFactory(selectedProduct, qty);
        Alert.alert('Success', `Return created: ${qty} units pending approval`);
      }
      
      closeModal();
      loadProducts();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Action failed');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actions</Text>
        <Text style={styles.headerSubtitle}>Manage your stock operations</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#007AFF' }]}
            onPress={() => openModal('take_stock')}
          >
            <Ionicons name="car" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Take Stock in Car</Text>
            <Text style={styles.actionDescription}>Move items from factory to car</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#34C759' }]}
            onPress={() => openModal('record_sale')}
          >
            <Ionicons name="cart" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Record Sales</Text>
            <Text style={styles.actionDescription}>Log sales from car, transport, or dispatch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('return')}
          >
            <Ionicons name="return-down-back" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Return to Factory</Text>
            <Text style={styles.actionDescription}>Send returns for manager approval</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            All stock movements are logged and can be undone within 24 hours
          </Text>
        </View>
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentAction === 'take_stock' && 'Take Stock in Car'}
                {currentAction === 'record_sale' && 'Record Sale'}
                {currentAction === 'return' && 'Return to Factory'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Select Product</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedProduct}
                  onValueChange={setSelectedProduct}
                  style={styles.picker}
                >
                  {finishedProducts.map((product) => (
                    <Picker.Item
                      key={product.id}
                      label={`${product.name} (${product.pack_size})`}
                      value={product.name}
                    />
                  ))}
                </Picker>
              </View>

              {currentAction === 'record_sale' && (
                <>
                  <Text style={styles.label}>Sale Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={saleType}
                      onValueChange={setSaleType}
                      style={styles.picker}
                    >
                      <Picker.Item label="Sold from Car" value="car" />
                      <Picker.Item label="Sold via Transport" value="transport" />
                      <Picker.Item label="Direct Factory Dispatch" value="direct_dispatch" />
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              {selectedProduct && (
                <View style={styles.stockInfo}>
                  {finishedProducts
                    .filter((p) => p.name === selectedProduct)
                    .map((product) => (
                      <View key={product.id}>
                        <Text style={styles.stockInfoText}>
                          Factory Stock: {product.factory_stock}
                        </Text>
                        <Text style={styles.stockInfoText}>
                          Car Stock: {product.car_stock}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleAction}>
                <Text style={styles.submitButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  actionsContainer: {
    padding: 16,
  },
  actionCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  actionDescription: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1976D2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  stockInfo: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  stockInfoText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
