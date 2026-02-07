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
import { getLooseOils, getRawMaterials, setRecipe, getRecipes } from '../../services/api';

export default function RecipesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [looseOils, setLooseOils] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recipes, setRecipes] = useState([]);
  
  const [selectedOil, setSelectedOil] = useState('');
  const [ingredients, setIngredients] = useState([{ raw_material_name: '', percentage: '' }]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oils, materials, recipesData] = await Promise.all([
        getLooseOils(),
        getRawMaterials(),
        getRecipes(),
      ]);
      setLooseOils(oils);
      setRawMaterials(materials);
      setRecipes(recipesData);
      if (oils.length > 0) setSelectedOil(oils[0].name);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const openModal = () => {
    setIngredients([{ raw_material_name: rawMaterials[0]?.name || '', percentage: '' }]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { raw_material_name: rawMaterials[0]?.name || '', percentage: '' }]);
  };

  const removeIngredient = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const calculateTotal = () => {
    return ingredients.reduce((sum, ing) => sum + (parseFloat(ing.percentage) || 0), 0);
  };

  const handleSetRecipe = async () => {
    const total = calculateTotal();
    if (Math.abs(total - 100) > 0.01) {
      Alert.alert('Error', `Recipe percentages must total 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.raw_material_name && ing.percentage
    ).map((ing) => ({
      raw_material_name: ing.raw_material_name,
      percentage: parseFloat(ing.percentage),
    }));

    if (validIngredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    try {
      await setRecipe(selectedOil, validIngredients);
      Alert.alert('Success', 'Recipe saved successfully');
      closeModal();
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save recipe');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manufacturing Recipes</Text>
        <Text style={styles.headerSubtitle}>Set recipes for loose oils</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Set New Recipe</Text>
        </TouchableOpacity>

        {recipes.map((recipe) => (
          <View key={recipe.id} style={styles.recipeCard}>
            <View style={styles.recipeHeader}>
              <Text style={styles.recipeName}>{recipe.loose_oil_name}</Text>
            </View>
            {recipe.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={styles.ingredientName}>{ing.raw_material_name}</Text>
                <Text style={styles.ingredientPercentage}>{ing.percentage}%</Text>
              </View>
            ))}
          </View>
        ))}

        {recipes.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>Create your first recipe to start manufacturing</Text>
          </View>
        )}
      </ScrollView>

      {/* Recipe Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Manufacturing Recipe</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Select Loose Oil</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedOil}
                  onValueChange={setSelectedOil}
                  style={styles.picker}
                >
                  {looseOils.map((oil) => (
                    <Picker.Item key={oil.id} label={oil.name} value={oil.name} />
                  ))}
                </Picker>
              </View>

              <View style={styles.ingredientsSection}>
                <Text style={styles.sectionTitle}>Ingredients (per 100L)</Text>
                
                {ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientInput}>
                    <View style={styles.ingredientPickerContainer}>
                      <Picker
                        selectedValue={ingredient.raw_material_name}
                        onValueChange={(value) => updateIngredient(index, 'raw_material_name', value)}
                        style={styles.ingredientPicker}
                      >
                        {rawMaterials.map((mat) => (
                          <Picker.Item key={mat.id} label={mat.name} value={mat.name} />
                        ))}
                      </Picker>
                    </View>
                    
                    <TextInput
                      style={styles.percentageInput}
                      placeholder="%"
                      value={ingredient.percentage}
                      onChangeText={(value) => updateIngredient(index, 'percentage', value)}
                      keyboardType="numeric"
                    />
                    
                    {ingredients.length > 1 && (
                      <TouchableOpacity onPress={() => removeIngredient(index)}>
                        <Ionicons name="trash" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity style={styles.addIngredientButton} onPress={addIngredient}>
                  <Ionicons name="add" size={20} color="#007AFF" />
                  <Text style={styles.addIngredientText}>Add Ingredient</Text>
                </TouchableOpacity>

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text
                    style={[
                      styles.totalValue,
                      Math.abs(calculateTotal() - 100) < 0.01 ? styles.totalValid : styles.totalInvalid,
                    ]}
                  >
                    {calculateTotal().toFixed(2)}%
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSetRecipe}>
                <Text style={styles.submitButtonText}>Save Recipe</Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recipeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  recipeHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 12,
    marginBottom: 12,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  ingredientPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
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
    maxHeight: '90%',
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
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  ingredientsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ingredientInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ingredientPickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  ingredientPicker: {
    height: 50,
  },
  percentageInput: {
    width: 80,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addIngredientText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalValid: {
    color: '#34C759',
  },
  totalInvalid: {
    color: '#FF3B30',
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
