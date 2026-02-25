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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  addRawMaterial,
  editRawMaterial,
  deleteRawMaterial,
  addPackingMaterial,
  editPackingMaterial,
  deletePackingMaterial,
  addLooseOil,
  editLooseOil,
  deleteLooseOil,
  addFinishedProduct,
  deleteFinishedProduct,
  editFinishedProduct,
  getLooseOils,
  getPackingMaterials,
  getRawMaterials,
  getFinishedProducts,
  getIntermediateGoods,
  addIntermediateGood,
  deleteIntermediateGood,
  setIntermediateRecipe,
  getIntermediateRecipes,
} from '../../services/api';

// Web-compatible alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Web-compatible confirm function
const showConfirm = (title: string, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${message}`));
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    }
  });
};

export default function AddItemsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const [itemType, setItemType] = useState(null);
  const [listType, setListType] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Add form states
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('litres');
  const [sizeLabel, setSizeLabel] = useState('');
  const [packSize, setPackSize] = useState('');
  const [linkedLooseOil, setLinkedLooseOil] = useState('');
  const [linkedPackingMaterial, setLinkedPackingMaterial] = useState('');
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('litres');
  const [editSizeLabel, setEditSizeLabel] = useState('');
  const [editPackSize, setEditPackSize] = useState('');
  const [editLinkedLooseOil, setEditLinkedLooseOil] = useState('');
  const [editLinkedPackingMaterial, setEditLinkedPackingMaterial] = useState('');
  
  // Data
  const [looseOils, setLooseOils] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [intermediateGoods, setIntermediateGoods] = useState([]);
  const [intermediateRecipes, setIntermediateRecipes] = useState([]);
  
  // Intermediate goods form
  const [igModalVisible, setIgModalVisible] = useState(false);
  const [igName, setIgName] = useState('');
  const [igUnit, setIgUnit] = useState('litres');
  const [igRecipeModalVisible, setIgRecipeModalVisible] = useState(false);
  const [selectedIG, setSelectedIG] = useState(null);
  const [igIngredients, setIgIngredients] = useState<{raw_material_name: string; quantity_per_unit: number}[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oils, packing, raw, products, igs, igRecipes] = await Promise.all([
        getLooseOils(),
        getPackingMaterials(),
        getRawMaterials(),
        getFinishedProducts(),
        getIntermediateGoods(),
        getIntermediateRecipes(),
      ]);
      setLooseOils(oils);
      setPackingMaterials(packing);
      setRawMaterials(raw);
      setFinishedProducts(products);
      setIntermediateGoods(igs);
      setIntermediateRecipes(igRecipes);
      if (oils.length > 0) setLinkedLooseOil(oils[0].name);
      if (packing.length > 0) setLinkedPackingMaterial(packing[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error', 'Failed to load data. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAddModal = (type) => {
    setItemType(type);
    setName('');
    setSizeLabel('');
    setPackSize('');
    setUnit('litres');
    if (type === 'finished') {
      if (looseOils.length > 0) setLinkedLooseOil(looseOils[0].name);
      if (packingMaterials.length > 0) setLinkedPackingMaterial(packingMaterials[0].name);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setItemType(null);
  };

  const openListModal = (type) => {
    setListType(type);
    setListModalVisible(true);
  };

  const closeListModal = () => {
    setListModalVisible(false);
    setListType(null);
  };

  const openEditModal = (item, type) => {
    setEditingItem(item);
    setListType(type);
    setEditName(item.name);
    if (type === 'raw') {
      setEditUnit(item.unit);
    } else if (type === 'packing') {
      setEditSizeLabel(item.size_label || '');
    } else if (type === 'finished') {
      setEditPackSize(item.pack_size || '');
      setEditLinkedLooseOil(item.linked_loose_oil || (looseOils.length > 0 ? looseOils[0].name : ''));
      setEditLinkedPackingMaterial(item.linked_packing_material || (packingMaterials.length > 0 ? packingMaterials[0].name : ''));
    }
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditName('');
    setEditUnit('litres');
    setEditSizeLabel('');
    setEditPackSize('');
    setEditLinkedLooseOil('');
    setEditLinkedPackingMaterial('');
  };

  const handleAddItem = async () => {
    if (!name.trim()) {
      showAlert('Error', 'Please enter a name');
      return;
    }

    setLoading(true);
    try {
      if (itemType === 'raw') {
        await addRawMaterial(name, unit);
        showAlert('Success', 'Raw material added successfully');
      } else if (itemType === 'packing') {
        await addPackingMaterial(name, sizeLabel);
        showAlert('Success', 'Packing material added successfully');
      } else if (itemType === 'loose') {
        await addLooseOil(name);
        showAlert('Success', 'Loose oil added successfully');
      } else if (itemType === 'finished') {
        if (!packSize || !linkedLooseOil || !linkedPackingMaterial) {
          showAlert('Error', 'Please fill all fields');
          setLoading(false);
          return;
        }
        await addFinishedProduct(name, packSize, linkedLooseOil, linkedPackingMaterial);
        showAlert('Success', 'Finished product added successfully');
      }
      closeModal();
      loadData();
    } catch (error: any) {
      console.error('Error adding item:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!editName.trim()) {
      showAlert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      if (listType === 'raw') {
        await editRawMaterial(
          editingItem.name,
          editName !== editingItem.name ? editName : undefined,
          editUnit !== editingItem.unit ? editUnit : undefined
        );
      } else if (listType === 'packing') {
        await editPackingMaterial(
          editingItem.name,
          editName !== editingItem.name ? editName : undefined,
          editSizeLabel !== editingItem.size_label ? editSizeLabel : undefined
        );
      } else if (listType === 'loose') {
        await editLooseOil(
          editingItem.name,
          editName !== editingItem.name ? editName : undefined
        );
      } else if (listType === 'finished') {
        await editFinishedProduct(
          editingItem.name,
          editingItem.pack_size,
          {
            new_name: editName !== editingItem.name ? editName : undefined,
            new_pack_size: editPackSize !== editingItem.pack_size ? editPackSize : undefined,
            new_linked_loose_oil: editLinkedLooseOil !== editingItem.linked_loose_oil ? editLinkedLooseOil : undefined,
            new_linked_packing_material: editLinkedPackingMaterial !== editingItem.linked_packing_material ? editLinkedPackingMaterial : undefined,
          }
        );
      }
      showAlert('Success', 'Item updated successfully');
      closeEditModal();
      loadData();
    } catch (error: any) {
      console.error('Error editing item:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item, type) => {
    const itemName = type === 'finished' ? `${item.name} (${item.pack_size})` : item.name;
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      setLoading(true);
      try {
        if (type === 'raw') {
          await deleteRawMaterial(item.name);
        } else if (type === 'packing') {
          await deletePackingMaterial(item.name);
        } else if (type === 'loose') {
          await deleteLooseOil(item.name);
        } else if (type === 'finished') {
          await deleteFinishedProduct(item.name, item.pack_size);
        }
        showAlert('Success', `"${itemName}" deleted successfully`);
        loadData();
      } catch (error: any) {
        console.error('Error deleting item:', error);
        showAlert('Error', error.response?.data?.detail || 'Failed to delete item');
      } finally {
        setLoading(false);
      }
    }
  };

  const getListData = () => {
    if (listType === 'raw') return rawMaterials;
    if (listType === 'packing') return packingMaterials;
    if (listType === 'loose') return looseOils;
    if (listType === 'finished') return finishedProducts;
    return [];
  };

  const getListTitle = () => {
    if (listType === 'raw') return 'Raw Materials';
    if (listType === 'packing') return 'Packing Materials';
    if (listType === 'loose') return 'Loose Oils';
    if (listType === 'finished') return 'Finished Products';
    return 'Items';
  };

  const renderListItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName}>{item.name}</Text>
        {listType === 'raw' && (
          <>
            <Text style={styles.listItemDetail}>Unit: {item.unit}</Text>
            <Text style={styles.listItemStock}>Stock: {item.stock || 0} {item.unit}</Text>
          </>
        )}
        {listType === 'packing' && (
          <>
            {item.size_label && <Text style={styles.listItemDetail}>Size: {item.size_label}</Text>}
            <Text style={styles.listItemStock}>Stock: {item.stock || 0} units</Text>
          </>
        )}
        {listType === 'loose' && (
          <Text style={styles.listItemStock}>Stock: {item.stock_litres || 0} litres</Text>
        )}
        {listType === 'finished' && (
          <>
            <Text style={styles.listItemDetail}>Pack: {item.pack_size} | Oil: {item.linked_loose_oil}</Text>
            <Text style={styles.listItemStock}>Factory: {item.factory_stock || 0} | Car: {item.car_stock || 0}</Text>
          </>
        )}
      </View>
      <View style={styles.listItemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item, listType)}
          data-testid={`edit-btn-${item.name}`}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item, listType)}
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
        <Text style={styles.headerTitle}>Manage Items</Text>
        <Text style={styles.headerSubtitle}>Add, edit, or delete products</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ADD SECTION */}
        <Text style={styles.sectionTitle}>Add New Items</Text>
        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[styles.smallCard, { backgroundColor: '#FF9500' }]}
            onPress={() => openAddModal('raw')}
          >
            <Ionicons name="flask" size={28} color="#fff" />
            <Text style={styles.smallCardTitle}>Raw Material</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallCard, { backgroundColor: '#34C759' }]}
            onPress={() => openAddModal('packing')}
          >
            <Ionicons name="albums" size={28} color="#fff" />
            <Text style={styles.smallCardTitle}>Packing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[styles.smallCard, { backgroundColor: '#5856D6' }]}
            onPress={() => openAddModal('loose')}
          >
            <Ionicons name="water" size={28} color="#fff" />
            <Text style={styles.smallCardTitle}>Loose Oil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallCard, { backgroundColor: '#007AFF' }]}
            onPress={() => openAddModal('finished')}
          >
            <Ionicons name="cube" size={28} color="#fff" />
            <Text style={styles.smallCardTitle}>Finished Product</Text>
          </TouchableOpacity>
        </View>

        {/* MANAGE SECTION */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Manage Existing Items</Text>
        
        <TouchableOpacity style={styles.manageCard} onPress={() => openListModal('raw')}>
          <View style={styles.manageCardLeft}>
            <View style={[styles.manageIconBox, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="flask" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.manageCardTitle}>Raw Materials</Text>
              <Text style={styles.manageCardCount}>{rawMaterials.length} items</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.manageCard} onPress={() => openListModal('packing')}>
          <View style={styles.manageCardLeft}>
            <View style={[styles.manageIconBox, { backgroundColor: '#34C759' }]}>
              <Ionicons name="albums" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.manageCardTitle}>Packing Materials</Text>
              <Text style={styles.manageCardCount}>{packingMaterials.length} items</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.manageCard} onPress={() => openListModal('loose')}>
          <View style={styles.manageCardLeft}>
            <View style={[styles.manageIconBox, { backgroundColor: '#5856D6' }]}>
              <Ionicons name="water" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.manageCardTitle}>Loose Oils</Text>
              <Text style={styles.manageCardCount}>{looseOils.length} items</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.manageCard} onPress={() => openListModal('finished')}>
          <View style={styles.manageCardLeft}>
            <View style={[styles.manageIconBox, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="cube" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.manageCardTitle}>Finished Products</Text>
              <Text style={styles.manageCardCount}>{finishedProducts.length} items</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ADD MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {itemType === 'raw' && 'Add Raw Material'}
                {itemType === 'packing' && 'Add Packing Material'}
                {itemType === 'loose' && 'Add Loose Oil'}
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
                    <Picker selectedValue={unit} onValueChange={setUnit} style={styles.picker}>
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
                  <Text style={styles.label}>Pack Size * (e.g., 1L, 900ml, 1.5L)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1L, 900ml, 1.5L"
                    value={packSize}
                    onChangeText={setPackSize}
                  />

                  <Text style={styles.label}>Linked Loose Oil *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={linkedLooseOil} onValueChange={setLinkedLooseOil} style={styles.picker}>
                      {looseOils.map((oil) => (
                        <Picker.Item key={oil.id} label={oil.name} value={oil.name} />
                      ))}
                    </Picker>
                  </View>

                  <Text style={styles.label}>Linked Packing Material *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={linkedPackingMaterial} onValueChange={setLinkedPackingMaterial} style={styles.picker}>
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Item</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LIST MODAL */}
      <Modal visible={listModalVisible} animationType="slide" transparent onRequestClose={closeListModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getListTitle()}</Text>
              <TouchableOpacity onPress={closeListModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={getListData()}
              keyExtractor={(item) => item.id}
              renderItem={renderListItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="folder-open-outline" size={48} color="#8E8E93" />
                  <Text style={styles.emptyListText}>No items found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {getListTitle().slice(0, -1)}</Text>
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

              {listType === 'raw' && (
                <>
                  <Text style={styles.label}>Unit *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={editUnit} onValueChange={setEditUnit} style={styles.picker}>
                      <Picker.Item label="Litres" value="litres" />
                      <Picker.Item label="Kg" value="kg" />
                    </Picker>
                  </View>
                </>
              )}

              {listType === 'packing' && (
                <>
                  <Text style={styles.label}>Size Label</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1L, 3.5L, 5L"
                    value={editSizeLabel}
                    onChangeText={setEditSizeLabel}
                  />
                </>
              )}

              {listType === 'finished' && (
                <>
                  <Text style={styles.label}>Pack Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1L, 900ml"
                    value={editPackSize}
                    onChangeText={setEditPackSize}
                  />

                  <Text style={styles.label}>Linked Loose Oil</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={editLinkedLooseOil} onValueChange={setEditLinkedLooseOil} style={styles.picker}>
                      {looseOils.map((oil) => (
                        <Picker.Item key={oil.id} label={oil.name} value={oil.name} />
                      ))}
                    </Picker>
                  </View>

                  <Text style={styles.label}>Linked Packing Material</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={editLinkedPackingMaterial} onValueChange={setEditLinkedPackingMaterial} style={styles.picker}>
                      {packingMaterials.map((pack) => (
                        <Picker.Item key={pack.id} label={pack.name} value={pack.name} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleEditItem}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update</Text>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  manageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  manageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageCardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  manageCardCount: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  modalBody: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
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
  picker: { height: 50 },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  submitButtonDisabled: { backgroundColor: '#8E8E93' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContainer: { padding: 16 },
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
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  listItemDetail: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  listItemStock: { fontSize: 14, color: '#007AFF', marginTop: 2 },
  listItemActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: { backgroundColor: '#007AFF' },
  deleteButton: { backgroundColor: '#FF3B30' },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyListText: { fontSize: 16, color: '#8E8E93', marginTop: 12 },
});
