import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (email: string, password: string, name: string, role: string) => {
  const response = await api.post('/auth/register', { email, password, name, role });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Initialize data
export const initializeData = async () => {
  const response = await api.post('/init-data');
  return response.data;
};

// Stock
export const getFinishedProducts = async () => {
  const response = await api.get('/stock/finished-products');
  return response.data;
};

export const getLooseOils = async () => {
  const response = await api.get('/stock/loose-oils');
  return response.data;
};

export const getRawMaterials = async () => {
  const response = await api.get('/stock/raw-materials');
  return response.data;
};

export const getPackingMaterials = async () => {
  const response = await api.get('/stock/packing-materials');
  return response.data;
};

export const getPendingReturns = async () => {
  const response = await api.get('/stock/pending-returns');
  return response.data;
};

// Owner actions
export const addRawMaterial = async (name: string, unit: string) => {
  const response = await api.post('/owner/add-raw-material', { name, unit });
  return response.data;
};

export const editRawMaterial = async (name: string, new_name?: string, new_unit?: string) => {
  const response = await api.put('/owner/edit-raw-material', { name, new_name, new_unit });
  return response.data;
};

export const deleteRawMaterial = async (name: string) => {
  const response = await api.delete(`/owner/delete-raw-material/${encodeURIComponent(name)}`);
  return response.data;
};

export const addPackingMaterial = async (name: string, size_label: string) => {
  const response = await api.post('/owner/add-packing-material', { name, size_label });
  return response.data;
};

export const editPackingMaterial = async (name: string, new_name?: string, new_size_label?: string) => {
  const response = await api.put('/owner/edit-packing-material', { name, new_name, new_size_label });
  return response.data;
};

export const deletePackingMaterial = async (name: string) => {
  const response = await api.delete(`/owner/delete-packing-material/${encodeURIComponent(name)}`);
  return response.data;
};

export const addLooseOil = async (name: string) => {
  const response = await api.post('/owner/add-loose-oil', { name });
  return response.data;
};

export const editLooseOil = async (name: string, new_name?: string) => {
  const response = await api.put('/owner/edit-loose-oil', { name, new_name });
  return response.data;
};

export const deleteLooseOil = async (name: string) => {
  const response = await api.delete(`/owner/delete-loose-oil/${encodeURIComponent(name)}`);
  return response.data;
};

export const deleteFinishedProduct = async (name: string, pack_size: string) => {
  const response = await api.delete(`/owner/delete-finished-product?name=${encodeURIComponent(name)}&pack_size=${encodeURIComponent(pack_size)}`);
  return response.data;
};

export const addFinishedProduct = async (
  name: string,
  pack_size: string,
  linked_loose_oil: string,
  linked_packing_material: string
) => {
  const response = await api.post('/owner/add-finished-product', {
    name,
    pack_size,
    linked_loose_oil,
    linked_packing_material,
  });
  return response.data;
};

export const setRecipe = async (loose_oil_name: string, ingredients: any[]) => {
  const response = await api.post('/owner/set-recipe', { loose_oil_name, ingredients });
  return response.data;
};

export const takeStockInCar = async (product_name: string, pack_size: string, quantity: number) => {
  const response = await api.post('/owner/take-stock-in-car', { product_name, pack_size, quantity });
  return response.data;
};

export const recordSale = async (product_name: string, pack_size: string, quantity: number, sale_type: string) => {
  const response = await api.post('/owner/record-sale', { product_name, pack_size, quantity, sale_type });
  return response.data;
};

export const returnToFactory = async (product_name: string, pack_size: string, quantity: number) => {
  const response = await api.post('/owner/return-to-factory', { product_name, pack_size, quantity });
  return response.data;
};

// Manager actions
export const addRawMaterialStock = async (raw_material_name: string, quantity: number) => {
  const response = await api.post('/manager/add-raw-material-stock', { raw_material_name, quantity });
  return response.data;
};

export const manufactureLooseOil = async (loose_oil_name: string, quantity_litres: number) => {
  const response = await api.post('/manager/manufacture-loose-oil', { loose_oil_name, quantity_litres });
  return response.data;
};

export const packFinishedGoods = async (product_name: string, pack_size: string, quantity: number) => {
  const response = await api.post('/manager/pack-finished-goods', { product_name, pack_size, quantity });
  return response.data;
};

export const approveReturn = async (return_id: string, action: string) => {
  const response = await api.post('/manager/approve-return', { return_id, action });
  return response.data;
};

export const markDamagedPacking = async (packing_name: string, quantity: number, reason: string) => {
  const response = await api.post('/manager/mark-damaged-packing', { packing_name, quantity, reason });
  return response.data;
};

// Search
export const searchStock = async (query: string) => {
  const response = await api.get('/search', { params: { query } });
  return response.data;
};

// Recipes
export const getRecipes = async () => {
  const response = await api.get('/recipes');
  return response.data;
};

// Transactions
export const getRecentTransactions = async () => {
  const response = await api.get('/transactions/recent');
  return response.data;
};

export const undoTransaction = async (transaction_id: string, reason: string) => {
  const response = await api.post('/transactions/undo', { transaction_id, reason });
  return response.data;
};

// Owner admin actions
export const editStock = async (
  item_type: string,
  item_name: string,
  field: string,
  new_value: number
) => {
  const response = await api.post('/owner/edit-stock', { item_type, item_name, field, new_value });
  return response.data;
};

export const resetAllStock = async () => {
  const response = await api.post('/owner/reset-all-stock');
  return response.data;
};

export default api;

export const addPackingMaterialStock = async (packing_material_name: string, quantity: number) => {
  const response = await api.post('/manager/add-packing-material-stock', { packing_material_name, quantity });
  return response.data;
};

export const getWeeklyReport = async () => {
  const response = await api.get('/owner/weekly-report');
  return response.data;
};

export const getDailyReport = async (date: string) => {
  const response = await api.get(`/owner/daily-report/${date}`);
  return response.data;
};
