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
  getRawMaterials,
  getLooseOils,
  getFinishedProducts,
  getPackingMaterials,
  addRawMaterialStock,
  manufactureLooseOil,
  packFinishedGoods,
  markDamagedPacking,
} from '../../services/api';

export default function ManagerActionsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  
  const [rawMaterials, setRawMaterials] = useState([]);
  const [looseOils, setLooseOils] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Broken');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, oils, products, packing] = await Promise.all([
        getRawMaterials(),
        getLooseOils(),
        getFinishedProducts(),
        getPackingMaterials(),
      ]);
      setRawMaterials(raw);
      setLooseOils(oils);
      setFinishedProducts(products);
      setPackingMaterials(packing);
      
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
    } else if (action === 'manufacture') {
      setSelectedItem(looseOils[0]?.name || '');
    } else if (action === 'pack') {
      setSelectedItem(finishedProducts[0]?.name || '');
    } else if (action === 'damaged') {
      setSelectedItem(packingMaterials[0]?.name || '');
    }
    
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentAction(null);
  };

  const handleAction = async () => {
    if (!selectedItem || !quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const qty = parseFloat(quantity);
      
      if (currentAction === 'add_raw') {
        await addRawMaterialStock(selectedItem, qty);
        Alert.alert('Success', `Added ${qty} to ${selectedItem}`);
      } else if (currentAction === 'manufacture') {
        const result = await manufactureLooseOil(selectedItem, qty);
        Alert.alert('Success', `Manufactured ${qty}L of ${selectedItem}`);
      } else if (currentAction === 'pack') {
        await packFinishedGoods(selectedItem, parseInt(qty));
        Alert.alert('Success', `Packed ${parseInt(qty)} units of ${selectedItem}`);
      } else if (currentAction === 'damaged') {
        await markDamagedPacking(selectedItem, parseInt(qty), reason);
        Alert.alert('Success', `Marked ${parseInt(qty)} units as damaged`);
      }
      
      closeModal();
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Action failed');
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
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('add_raw')}
          >
            <Ionicons name="add-circle" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Add Raw Material</Text>
            <Text style={styles.actionDescription}>Increase raw material stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#007AFF' }]}
            onPress={() => openModal('manufacture')}
          >
            <Ionicons name="construct" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Manufacture Loose Oil</Text>
            <Text style={styles.actionDescription}>Apply recipes to create oil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#34C759' }]}
            onPress={() => openModal('pack')}
          >
            <Ionicons name="cube" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Pack Finished Goods</Text>
            <Text style={styles.actionDescription}>Package loose oil into bottles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FF3B30' }]}
            onPress={() => openModal('damaged')}
          >
            <Ionicons name="trash" size={32} color="#fff" />
            <Text style={styles.actionTitle}>Mark Damaged Packing</Text>
            <Text style={styles.actionDescription}>Record damaged bottles</Text>
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
              <Text style={styles.modalTitle}>
                {currentAction === 'add_raw' && 'Add Raw Material Stock'}
                {currentAction === 'manufacture' && 'Manufacture Loose Oil'}
                {currentAction === 'pack' && 'Pack Finished Goods'}
                {currentAction === 'damaged' && 'Mark Damaged Packing'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>
                {currentAction === 'add_raw' && 'Select Raw Material'}
                {currentAction === 'manufacture' && 'Select Loose Oil'}
                {currentAction === 'pack' && 'Select Product'}
                {currentAction === 'damaged' && 'Select Packing Material'}
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedItem}
                  onValueChange={setSelectedItem}
                  style={styles.picker}
                >
                  {currentAction === 'add_raw' &&
                    rawMaterials.map((mat) => (
                      <Picker.Item key={mat.id} label={mat.name} value={mat.name} />
                    ))}
                  {currentAction === 'manufacture' &&
                    looseOils.map((oil) => (
                      <Picker.Item key={oil.id} label={oil.name} value={oil.name} />
                    ))}
                  {currentAction === 'pack' &&
                    finishedProducts.map((product) => (
                      <Picker.Item
                        key={product.id}
                        label={`${product.name} (${product.pack_size})`}
                        value={product.name}
                      />
                    ))}
                  {currentAction === 'damaged' &&
                    packingMaterials.map((pack) => (
                      <Picker.Item key={pack.id} label={pack.name} value={pack.name} />
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
                      <Picker.Item label="Handling" value="Handling" />
                      <Picker.Item label="Supplier" value="Supplier" />
                      <Picker.Item label="Other" value="Other" />
                    </Picker>
                  </View>
                </>
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
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
