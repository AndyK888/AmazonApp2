import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  sku: string;
  quantity: string;
  asin: string;
  fnsku: string;
  ean: string;
  upc: string;
}

export interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [
    { sku: 'SKU001', quantity: '10', asin: 'B00TEST123', fnsku: 'X00TEST123', ean: '1234567890123', upc: '123456789012' },
    { sku: 'SKU002', quantity: '5', asin: 'B00TEST456', fnsku: 'X00TEST456', ean: '2345678901234', upc: '234567890123' },
    { sku: '', quantity: '', asin: '', fnsku: '', ean: '', upc: '' },
    { sku: '', quantity: '', asin: '', fnsku: '', ean: '', upc: '' },
    { sku: '', quantity: '', asin: '', fnsku: '', ean: '', upc: '' },
  ],
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.items = action.payload;
    },
    updateProduct: (state, action: PayloadAction<{ index: number; data: Partial<Product> }>) => {
      const { index, data } = action.payload;
      state.items[index] = { ...state.items[index], ...data };
    },
    addProduct: (state) => {
      state.items.push({ sku: '', quantity: '', asin: '', fnsku: '', ean: '', upc: '' });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setProducts, updateProduct, addProduct, setLoading, setError } = productsSlice.actions;
export default productsSlice.reducer; 