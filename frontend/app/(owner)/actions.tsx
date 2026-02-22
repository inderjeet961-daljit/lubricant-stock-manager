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
  Platform,
  ActivityIndicator,
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

// Web-compatible alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function OwnerActionsScreen() {
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // selectedProduct now stores "name|pack_size"
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
        // Store as "name|pack_size"
        setSelectedProduct(`${products[0].name}|${products[0].pack_size}`);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const openModal = (action) => {
    setCurrentAction(action);
    setQuantity('');
    if (finishedProducts.length > 0) {
      setSelectedProduct(`${finishedProducts[0].name}|${finishedProducts[0].pack_size}`);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentAction(null);
    setQuantity('');
  };

  const handleAction = async () => {
    if (!selectedProduct || !quantity || isNaN(Number(quantity)) || parseInt(quantity) <= 0) {
      showAlert('Error', 'Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const qty = parseInt(quantity);
      const [productName, packSize] = selectedProduct.split('|');
      
      if (currentAction === 'take_stock') {
        await takeStockInCar(productName, packSize, qty);
        showAlert('Success', `Moved ${qty} units of ${productName} (${packSize}) to car`);
      } else if (currentAction === 'record_sale') {
        await recordSale(productName, packSize, qty, saleType);
        showAlert('Success', `Sale recorded: ${qty} units of ${productName} (${packSize}) via ${saleType}`);
      } else if (currentAction === 'return') {
        await returnToFactory(productName, packSize, qty);
        showAlert('Success', `Return created: ${qty} units of ${productName} (${packSize}) pending approval`);
      }
      
      closeModal();
      loadProducts();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (currentAction) {
      case 'take_stock': return 'Take Stock in Car';
      case 'record_sale': return 'Record Sale';
      case 'return': return 'Return to Factory';
      default: return '';
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
            <Text style={styles.actionDescription}>Move finished goods from factory to car</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#34C759' }]}
            onPress={() => openModal('record_sale')}
          >
            <Ionicons name="cash" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Record Sale</Text>
            <Text style={styles.actionDescription}>Record a sale from car, transport, or direct</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('return')}
          >
            <Ionicons name="return-down-back" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Return to Factory</Text>
            <Text style={styles.actionDescription}>Return unsold stock (pending manager approval)</Text>
          </TouchableOpacity>
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
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                      label={`${product.name} (${product.pack_size}) - Factory: ${product.factory_stock || 0} | Car: ${product.car_stock || 0}`}
                      value={`${product.name}|${product.pack_size}`}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              {currentAction === 'record_sale' && (
                <>
                  <Text style={styles.label}>Sale Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={saleType}
                      onValueChange={setSaleType}
                      style={styles.picker}
                    >
                      <Picker.Item label="From Car" value="car" />
                      <Picker.Item label="Transport" value="transport" />
                      <Picker.Item label="Direct Dispatch" value="direct" />
                    </Picker>
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                onPress={handleAction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
