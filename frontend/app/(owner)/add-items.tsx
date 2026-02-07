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
  addRawMaterial,
  addPackingMaterial,
  addFinishedProduct,
  getLooseOils,
  getPackingMaterials,
} from '../../services/api';

export default function AddItemsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [itemType, setItemType] = useState(null);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('litres');
  const [sizeLabel, setSizeLabel] = useState('');
  const [packSize, setPackSize] = useState('');
  const [linkedLooseOil, setLinkedLooseOil] = useState('');
  const [linkedPackingMaterial, setLinkedPackingMaterial] = useState('');
  
  const [looseOils, setLooseOils] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oils, packing] = await Promise.all([
        getLooseOils(),
        getPackingMaterials(),
      ]);
      setLooseOils(oils);
      setPackingMaterials(packing);
      if (oils.length > 0) setLinkedLooseOil(oils[0].name);
      if (packing.length > 0) setLinkedPackingMaterial(packing[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const openModal = (type) => {
    setItemType(type);
    setName('');
    setSizeLabel('');
    setPackSize('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setItemType(null);
  };

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      if (itemType === 'raw') {
        await addRawMaterial(name, unit);
        Alert.alert('Success', 'Raw material added successfully');
      } else if (itemType === 'packing') {
        await addPackingMaterial(name, sizeLabel);
        Alert.alert('Success', 'Packing material added successfully');
        loadData();
      } else if (itemType === 'finished') {
        if (!packSize || !linkedLooseOil || !linkedPackingMaterial) {
          Alert.alert('Error', 'Please fill all fields');
          return;
        }
        await addFinishedProduct(name, packSize, linkedLooseOil, linkedPackingMaterial);
        Alert.alert('Success', 'Finished product added successfully');
      }
      closeModal();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add item');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Items</Text>
        <Text style={styles.headerSubtitle}>Create new products and materials</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('raw')}
          >
            <Ionicons name="flask" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Add Raw Material</Text>
            <Text style={styles.cardDescription}>Base oils, additives, etc.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#34C759' }]}
            onPress={() => openModal('packing')}
          >
            <Ionicons name="albums" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Add Packing Material</Text>
            <Text style={styles.cardDescription}>Bottles, containers, etc.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#007AFF' }]}
            onPress={() => openModal('finished')}
          >
            <Ionicons name="cube" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Add Finished Product</Text>
            <Text style={styles.cardDescription}>Link oil & packing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Item Modal */}
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
                {itemType === 'raw' && 'Add Raw Material'}
                {itemType === 'packing' && 'Add Packing Material'}
                {itemType === 'finished' && 'Add Finished Product'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
              />

              {itemType === 'raw' && (
                <>
                  <Text style={styles.label}>Unit *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={unit}
                      onValueChange={setUnit}
                      style={styles.picker}
                    >
                      <Picker.Item label="Litres" value="litres" />
                      <Picker.Item label="Kg" value="kg" />
                    </Picker>
                  </View>
                </>
              )}

              {itemType === 'packing' && (
                <>
                  <Text style={styles.label}>Size Label (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1L, 3.5L, 5L"
                    value={sizeLabel}
                    onChangeText={setSizeLabel}
                  />
                </>
              )}

              {itemType === 'finished' && (
                <>
                  <Text style={styles.label}>Pack Size *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1L, 3.5L, 5L"
                    value={packSize}
                    onChangeText={setPackSize}
                  />

                  <Text style={styles.label}>Linked Loose Oil *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={linkedLooseOil}
                      onValueChange={setLinkedLooseOil}
                      style={styles.picker}
                    >
                      {looseOils.map((oil) => (
                        <Picker.Item key={oil.id} label={oil.name} value={oil.name} />
                      ))}
                    </Picker>
                  </View>

                  <Text style={styles.label}>Linked Packing Material *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={linkedPackingMaterial}
                      onValueChange={setLinkedPackingMaterial}
                      style={styles.picker}
                    >
                      {packingMaterials.map((pack) => (
                        <Picker.Item key={pack.id} label={pack.name} value={pack.name} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleAddItem}>
                <Text style={styles.submitButtonText}>Add Item</Text>
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
  cardsContainer: {
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  cardDescription: {
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
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
