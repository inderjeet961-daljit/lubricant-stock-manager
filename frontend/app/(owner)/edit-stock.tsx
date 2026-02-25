import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getFinishedProducts,
  getLooseOils,
  getRawMaterials,
  getPackingMaterials,
  editStock,
} from '../../services/api';

export default function EditStockScreen() {
  const router = useRouter();
  const [itemType, setItemType] = useState('finished_product');
  const [selectedItem, setSelectedItem] = useState('');
  const [field, setField] = useState('factory_stock');
  const [newValue, setNewValue] = useState('');
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [looseOils, setLooseOils] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [packingMaterials, setPackingMaterials] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [products, oils, raw, packing] = await Promise.all([
        getFinishedProducts(),
        getLooseOils(),
        getRawMaterials(),
        getPackingMaterials(),
      ]);
      setFinishedProducts(products);
      setLooseOils(oils);
      setRawMaterials(raw);
      setPackingMaterials(packing);
      
      if (products.length > 0) setSelectedItem(products[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getCurrentStock = () => {
    let item;
    if (itemType === 'finished_product') {
      item = finishedProducts.find((p) => p.name === selectedItem);
      return item ? item[field] : 0;
    } else if (itemType === 'loose_oil') {
      item = looseOils.find((o) => o.name === selectedItem);
      return item ? item.stock_litres : 0;
    } else if (itemType === 'raw_material') {
      item = rawMaterials.find((m) => m.name === selectedItem);
      return item ? item.stock : 0;
    } else if (itemType === 'packing_material') {
      item = packingMaterials.find((p) => p.name === selectedItem);
      return item ? item.stock : 0;
    }
    return 0;
  };

  const handleUpdateStock = async () => {
    if (!newValue || isNaN(newValue) || parseFloat(newValue) < 0) {
      Alert.alert('Error', 'Please enter a valid non-negative number');
      return;
    }

    const actualField = itemType === 'finished_product' ? field : 
                       itemType === 'loose_oil' ? 'stock_litres' : 'stock';

    Alert.alert(
      'Confirm Stock Edit',
      `Are you sure you want to set ${selectedItem} ${actualField} to ${newValue}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await editStock(itemType, selectedItem, actualField, parseFloat(newValue));
              Alert.alert('Success', 'Stock updated successfully');
              setNewValue('');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update stock');
            }
          },
        },
      ]
    );
  };

  const getItemList = () => {
    switch (itemType) {
      case 'finished_product':
        return finishedProducts;
      case 'loose_oil':
        return looseOils;
      case 'raw_material':
        return rawMaterials;
      case 'packing_material':
        return packingMaterials;
      default:
        return [];
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Stock Manually</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Select Stock Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={itemType}
              onValueChange={(value) => {
                setItemType(value);
                setField(value === 'finished_product' ? 'factory_stock' : 'stock');
                setNewValue('');
              }}
              style={styles.picker}
            >
              <Picker.Item label="Finished Products" value="finished_product" />
              <Picker.Item label="Loose Oils" value="loose_oil" />
              <Picker.Item label="Raw Materials" value="raw_material" />
              <Picker.Item label="Packing Materials" value="packing_material" />
            </Picker>
          </View>

          <Text style={styles.label}>Select Item</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedItem}
              onValueChange={setSelectedItem}
              style={styles.picker}
            >
              {getItemList().map((item) => (
                <Picker.Item key={item.id} label={item.name} value={item.name} />
              ))}
            </Picker>
          </View>

          {itemType === 'finished_product' && (
            <>
              <Text style={styles.label}>Select Field</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={field}
                  onValueChange={setField}
                  style={styles.picker}
                >
                  <Picker.Item label="Factory Stock" value="factory_stock" />
                  <Picker.Item label="Car Stock" value="car_stock" />
                </Picker>
              </View>
            </>
          )}

          <View style={styles.currentStockBox}>
            <Text style={styles.currentStockLabel}>Current Stock:</Text>
            <Text style={styles.currentStockValue}>{getCurrentStock()}</Text>
          </View>

          <Text style={styles.label}>New Value</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new stock quantity"
            value={newValue}
            onChangeText={setNewValue}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.updateButton} onPress={handleUpdateStock}>
            <Text style={styles.updateButtonText}>Update Stock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={styles.warningText}>
            Manual stock edits are logged and can be undone within 24 hours
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
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
  currentStockBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  currentStockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  currentStockValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
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
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#FF9500',
  },
});
