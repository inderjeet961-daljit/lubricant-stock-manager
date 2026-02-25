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
  getRawMaterials,
  getLooseOils,
  getFinishedProducts,
  getPackingMaterials,
  addRawMaterialStock,
  addPackingMaterialStock,
  manufactureLooseOil,
  packFinishedGoods,
  markDamagedPacking,
  getIntermediateGoods,
  getIntermediateRecipes,
  manufactureIntermediateGood,
  addCartons,
} from '../../services/api';

// Web-compatible alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ManagerActionsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [rawMaterials, setRawMaterials] = useState([]);
  const [looseOils, setLooseOils] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [intermediateGoods, setIntermediateGoods] = useState([]);
  
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cartons, setCartons] = useState('');
  const [reason, setReason] = useState('Broken');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, oils, products, packing, igs] = await Promise.all([
        getRawMaterials(),
        getLooseOils(),
        getFinishedProducts(),
        getPackingMaterials(),
        getIntermediateGoods(),
      ]);
      setRawMaterials(raw);
      setLooseOils(oils);
      setFinishedProducts(products);
      setPackingMaterials(packing);
      setIntermediateGoods(igs);
      
      if (raw.length > 0) setSelectedItem(raw[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const openModal = (action) => {
    setCurrentAction(action);
    setQuantity('');
    
    if (action === 'add_raw') {
      setSelectedItem(rawMaterials[0]?.name || '');
    } else if (action === 'add_packing') {
      setSelectedItem(packingMaterials[0]?.name || '');
    } else if (action === 'manufacture') {
      setSelectedItem(looseOils[0]?.name || '');
    } else if (action === 'pack') {
      const firstProduct = finishedProducts[0];
      setSelectedItem(firstProduct ? `${firstProduct.name}|${firstProduct.pack_size}` : '');
    } else if (action === 'damaged') {
      setSelectedItem(packingMaterials[0]?.name || '');
    } else if (action === 'manufacture_intermediate') {
      setSelectedItem(intermediateGoods[0]?.name || '');
    } else if (action === 'add_cartons') {
      const first = finishedProducts[0];
      setSelectedItem(first ? `${first.name}|${first.pack_size}` : '');
    }
    
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentAction(null);
    setCartons('');
  };

  const handleAction = async () => {
    if (!selectedItem || !quantity || isNaN(Number(quantity)) || parseFloat(quantity) <= 0) {
      showAlert('Error', 'Please enter a valid quantity greater than 0');
      return;
    }

    setLoading(true);
    try {
      const qty = parseFloat(quantity);
      
      if (currentAction === 'add_raw') {
        await addRawMaterialStock(selectedItem, qty);
        showAlert('Success', `Added ${qty} to ${selectedItem}`);
      } else if (currentAction === 'add_packing') {
        await addPackingMaterialStock(selectedItem, parseInt(String(qty)));
        showAlert('Success', `Added ${parseInt(String(qty))} units of ${selectedItem}`);
      } else if (currentAction === 'manufacture') {
        await manufactureLooseOil(selectedItem, qty);
        showAlert('Success', `Manufactured ${qty}L of ${selectedItem}`);
      } else if (currentAction === 'pack') {
        const [productName, packSize] = selectedItem.split('|');
        const cartonsCount = cartons ? parseInt(cartons) : 0;
        await packFinishedGoods(productName, packSize, parseInt(String(qty)), cartonsCount);
        showAlert('Success', `Packed ${parseInt(String(qty))} units` + (cartonsCount > 0 ? ` + ${cartonsCount} cartons` : '') + ` of ${productName} (${packSize})`);
      } else if (currentAction === 'add_cartons') {
        const [productName, packSize] = selectedItem.split('|');
        await addCartons(productName, packSize, parseInt(String(qty)));
        showAlert('Success', `Added ${parseInt(String(qty))} cartons of ${productName} (${packSize})`);
      } else if (currentAction === 'damaged') {
        await markDamagedPacking(selectedItem, parseInt(String(qty)), reason);
        showAlert('Success', `Marked ${parseInt(String(qty))} units as damaged`);
      } else if (currentAction === 'manufacture_intermediate') {
        await manufactureIntermediateGood(selectedItem, qty);
        showAlert('Success', `Manufactured ${qty} of ${selectedItem}`);
      }
      
      closeModal();
      loadData();
    } catch (error: any) {
      console.error('Action error:', error);
      const errorMessage = error.response?.data?.detail || 'Action failed. Please try again.';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (currentAction) {
      case 'add_raw': return 'Add Raw Material Stock';
      case 'add_packing': return 'Add Packing Material Stock';
      case 'manufacture': return 'Manufacture Loose Oil';
      case 'pack': return 'Pack Finished Goods';
      case 'damaged': return 'Mark Damaged Packing';
      case 'manufacture_intermediate': return 'Manufacture Intermediate Good';
      case 'add_cartons': return 'Add Cartons';
      default: return '';
    }
  };

  const getPickerLabel = () => {
    switch (currentAction) {
      case 'add_raw': return 'Select Raw Material';
      case 'add_packing': return 'Select Packing Container';
      case 'manufacture': return 'Select Loose Oil';
      case 'pack': return 'Select Product';
      case 'damaged': return 'Select Packing Material';
      case 'manufacture_intermediate': return 'Select Intermediate Good';
      case 'add_cartons': return 'Select Product';
      default: return 'Select Item';
    }
  };

  const getQuantityLabel = () => {
    switch (currentAction) {
      case 'add_raw': return 'Quantity (Units/Litres/Kg)';
      case 'add_packing': return 'Quantity (Pieces)';
      case 'manufacture': return 'Quantity (Litres)';
      case 'pack': return 'Quantity (Pieces)';
      case 'damaged': return 'Quantity (Pieces)';
      case 'manufacture_intermediate': return 'Quantity (Litres/Kg)';
      case 'add_cartons': return 'Number of Cartons';
      default: return 'Quantity';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Factory Actions</Text>
        <Text style={styles.headerSubtitle}>Manage production operations</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Stock Management</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.smallActionCard, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('add_raw')}
          >
            <Ionicons name="flask" size={28} color="#fff" />
            <Text style={styles.smallActionTitle}>Add Raw Material</Text>
            <Text style={styles.smallActionDesc}>Oils, Additives</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionCard, { backgroundColor: '#5856D6' }]}
            onPress={() => openModal('add_packing')}
          >
            <Ionicons name="cube-outline" size={28} color="#fff" />
            <Text style={styles.smallActionTitle}>Add Packing</Text>
            <Text style={styles.smallActionDesc}>Bottles, Containers</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Production</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.smallActionCard, { backgroundColor: '#007AFF' }]}
            onPress={() => openModal('manufacture')}
          >
            <Ionicons name="construct" size={28} color="#fff" />
            <Text style={styles.smallActionTitle}>Manufacture Oil</Text>
            <Text style={styles.smallActionDesc}>Uses Recipe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionCard, { backgroundColor: '#34C759' }]}
            onPress={() => openModal('pack')}
          >
            <Ionicons name="gift" size={28} color="#fff" />
            <Text style={styles.smallActionTitle}>Pack Goods</Text>
            <Text style={styles.smallActionDesc}>Oil + Bottles</Text>
          </TouchableOpacity>
        </View>

        {intermediateGoods.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Intermediate Goods</Text>
            <TouchableOpacity
              style={[styles.wideActionCard, { backgroundColor: '#E91E63' }]}
              onPress={() => openModal('manufacture_intermediate')}
              data-testid="manufacture-intermediate-btn"
            >
              <Ionicons name="flask" size={28} color="#fff" />
              <View style={styles.wideActionContent}>
                <Text style={styles.wideActionTitle}>Manufacture Intermediate Good</Text>
                <Text style={styles.wideActionDesc}>Blend raw materials into VI, VI Super, etc.</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Quality Control</Text>
        <TouchableOpacity
          style={[styles.wideActionCard, { backgroundColor: '#FF3B30' }]}
          onPress={() => openModal('damaged')}
        >
          <Ionicons name="warning" size={28} color="#fff" />
          <View style={styles.wideActionContent}>
            <Text style={styles.wideActionTitle}>Mark Damaged Packing</Text>
            <Text style={styles.wideActionDesc}>Record broken/defective containers</Text>
          </View>
        </TouchableOpacity>
        
        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Workflow Guide:</Text>
          <Text style={styles.helpText}>1. <Text style={styles.bold}>Add Raw Materials</Text> - Base oils, additives (Lubricating Oil, Polymer)</Text>
          <Text style={styles.helpText}>2. <Text style={styles.bold}>Manufacture Intermediate</Text> - Blend raw materials into VI, VI Super</Text>
          <Text style={styles.helpText}>3. <Text style={styles.bold}>Add Packing</Text> - Bottles & containers (1L, 5L bottles)</Text>
          <Text style={styles.helpText}>4. <Text style={styles.bold}>Manufacture Oil</Text> - Converts raw materials + intermediates into loose oil</Text>
          <Text style={styles.helpText}>5. <Text style={styles.bold}>Pack Goods</Text> - Loose oil + bottles into finished product</Text>
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
              <Text style={styles.label}>{getPickerLabel()}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedItem}
                  onValueChange={setSelectedItem}
                  style={styles.picker}
                >
                  {currentAction === 'add_raw' &&
                    rawMaterials.map((mat) => (
                      <Picker.Item key={mat.id} label={`${mat.name} (Stock: ${mat.stock || 0} ${mat.unit})`} value={mat.name} />
                    ))}
                  {currentAction === 'add_packing' &&
                    packingMaterials.map((pack) => (
                      <Picker.Item key={pack.id} label={`${pack.name} ${pack.size_label ? `(${pack.size_label})` : ''} - Stock: ${pack.stock || 0}`} value={pack.name} />
                    ))}
                  {currentAction === 'manufacture' &&
                    looseOils.map((oil) => (
                      <Picker.Item key={oil.id} label={`${oil.name} (Stock: ${oil.stock_litres || 0}L)`} value={oil.name} />
                    ))}
                  {currentAction === 'pack' &&
                    finishedProducts.map((product) => (
                      <Picker.Item
                        key={product.id}
                        label={`${product.name} (${product.pack_size}) - Factory: ${product.factory_stock || 0}`}
                        value={`${product.name}|${product.pack_size}`}
                      />
                    ))}
                  {currentAction === 'damaged' &&
                    packingMaterials.map((pack) => (
                      <Picker.Item key={pack.id} label={`${pack.name} (Stock: ${pack.stock || 0})`} value={pack.name} />
                    ))}
                  {currentAction === 'manufacture_intermediate' &&
                    intermediateGoods.map((ig) => (
                      <Picker.Item key={ig.id} label={`${ig.name} (Stock: ${ig.stock?.toFixed(1) || 0} ${ig.unit})`} value={ig.name} />
                    ))}
                </Picker>
              </View>

              <Text style={styles.label}>{getQuantityLabel()}</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              {currentAction === 'damaged' && (
                <>
                  <Text style={styles.label}>Reason</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={reason}
                      onValueChange={setReason}
                      style={styles.picker}
                    >
                      <Picker.Item label="Broken" value="Broken" />
                      <Picker.Item label="Defective" value="Defective" />
                      <Picker.Item label="Handling Error" value="Handling" />
                      <Picker.Item label="Supplier Defect" value="Supplier" />
                      <Picker.Item label="Other" value="Other" />
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  smallActionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  smallActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  smallActionDesc: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  wideActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  wideActionContent: {
    marginLeft: 12,
  },
  wideActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  wideActionDesc: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  helpSection: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginTop: 8,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
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
    maxHeight: '85%',
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
