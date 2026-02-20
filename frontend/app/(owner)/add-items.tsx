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
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  addRawMaterial,
  editRawMaterial,
  deleteRawMaterial,
  addPackingMaterial,
  addFinishedProduct,
  getLooseOils,
  getPackingMaterials,
  getRawMaterials,
} from '../../services/api';

export default function AddItemsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [itemType, setItemType] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('litres');
  const [sizeLabel, setSizeLabel] = useState('');
  const [packSize, setPackSize] = useState('');
  const [linkedLooseOil, setLinkedLooseOil] = useState('');
  const [linkedPackingMaterial, setLinkedPackingMaterial] = useState('');
  
  // For editing
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('litres');
  
  const [looseOils, setLooseOils] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oils, packing, raw] = await Promise.all([
        getLooseOils(),
        getPackingMaterials(),
        getRawMaterials(),
      ]);
      setLooseOils(oils);
      setPackingMaterials(packing);
      setRawMaterials(raw);
      if (oils.length > 0) setLinkedLooseOil(oils[0].name);
      if (packing.length > 0) setLinkedPackingMaterial(packing[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  const openListModal = () => {
    setListModalVisible(true);
  };

  const closeListModal = () => {
    setListModalVisible(false);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditName('');
    setEditUnit('litres');
  };

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setLoading(true);
    try {
      if (itemType === 'raw') {
        await addRawMaterial(name, unit);
        Alert.alert('Success', 'Raw material added successfully');
        loadData();
      } else if (itemType === 'packing') {
        await addPackingMaterial(name, sizeLabel);
        Alert.alert('Success', 'Packing material added successfully');
        loadData();
      } else if (itemType === 'finished') {
        if (!packSize || !linkedLooseOil || !linkedPackingMaterial) {
          Alert.alert('Error', 'Please fill all fields');
          setLoading(false);
          return;
        }
        await addFinishedProduct(name, packSize, linkedLooseOil, linkedPackingMaterial);
        Alert.alert('Success', 'Finished product added successfully');
      }
      closeModal();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRawMaterial = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await editRawMaterial(
        editingItem.name,
        editName !== editingItem.name ? editName : undefined,
        editUnit !== editingItem.unit ? editUnit : undefined
      );
      Alert.alert('Success', 'Raw material updated successfully');
      closeEditModal();
      loadData();
    } catch (error) {
      console.error('Error editing raw material:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update raw material. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRawMaterial = (item) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteRawMaterial(item.name);
              Alert.alert('Success', `"${item.name}" deleted successfully`);
              loadData();
            } catch (error) {
              console.error('Error deleting raw material:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete raw material. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderRawMaterialItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName}>{item.name}</Text>
        <Text style={styles.listItemUnit}>Unit: {item.unit}</Text>
        <Text style={styles.listItemStock}>Stock: {item.stock || 0} {item.unit}</Text>
      </View>
      <View style={styles.listItemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRawMaterial(item)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Items</Text>
        <Text style={styles.headerSubtitle}>Create new products and materials</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#FF9500' }]}
            onPress={() => openModal('raw')}
          >
            <Ionicons name="flask" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Add Raw Material</Text>
            <Text style={styles.cardDescription}>Base oils, additives, etc.</Text>
          </TouchableOpacity>

          {/* View/Edit/Delete Raw Materials Button */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#8E8E93' }]}
            onPress={openListModal}
          >
            <Ionicons name="list" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Manage Raw Materials</Text>
            <Text style={styles.cardDescription}>View, edit or delete ({rawMaterials.length} items)</Text>
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

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                onPress={handleAddItem}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adding...' : 'Add Item'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Raw Materials List Modal */}
      <Modal
        visible={listModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeListModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raw Materials</Text>
              <TouchableOpacity onPress={closeListModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rawMaterials}
              keyExtractor={(item) => item.id}
              renderItem={renderRawMaterialItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="flask-outline" size={48} color="#8E8E93" />
                  <Text style={styles.emptyListText}>No raw materials yet</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Edit Raw Material Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Raw Material</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>Unit *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editUnit}
                  onValueChange={setEditUnit}
                  style={styles.picker}
                >
                  <Picker.Item label="Litres" value="litres" />
                  <Picker.Item label="Kg" value="kg" />
                </Picker>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                onPress={handleEditRawMaterial}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Updating...' : 'Update Material'}
                </Text>
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
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  listItemUnit: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  listItemStock: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyListText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
});
