import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Listing {
  sku: string;
  asin: string;
  price: string;
  quantity: string;
  condition: string;
  fulfillmentChannel: string;
  status: string;
  openDate: string;
  itemName: string;
  category: string;
}

export interface ListingsState {
  items: Listing[];
  loading: boolean;
  error: string | null;
}

const initialState: ListingsState = {
  items: [
    { 
      sku: 'SKU001', 
      asin: 'B00TEST123', 
      price: '19.99',
      quantity: '10',
      condition: 'New',
      fulfillmentChannel: 'Amazon',
      status: 'Active',
      openDate: '2023-01-15',
      itemName: 'Test Product 1',
      category: 'Electronics'
    },
    { 
      sku: 'SKU002', 
      asin: 'B00TEST456', 
      price: '29.99',
      quantity: '5',
      condition: 'New',
      fulfillmentChannel: 'Amazon',
      status: 'Active',
      openDate: '2023-02-20',
      itemName: 'Test Product 2',
      category: 'Home & Kitchen'
    },
    { 
      sku: '', 
      asin: '', 
      price: '',
      quantity: '',
      condition: '',
      fulfillmentChannel: '',
      status: '',
      openDate: '',
      itemName: '',
      category: ''
    }
  ],
  loading: false,
  error: null,
};

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    setListings: (state, action: PayloadAction<Listing[]>) => {
      state.items = action.payload;
    },
    updateListing: (state, action: PayloadAction<{ index: number; data: Partial<Listing> }>) => {
      const { index, data } = action.payload;
      state.items[index] = { ...state.items[index], ...data };
    },
    addListing: (state) => {
      state.items.push({ 
        sku: '', 
        asin: '', 
        price: '',
        quantity: '',
        condition: '',
        fulfillmentChannel: '',
        status: '',
        openDate: '',
        itemName: '',
        category: ''
      });
    },
    addMultipleListings: (state, action: PayloadAction<Listing[]>) => {
      state.items.push(...action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setListings, updateListing, addListing, addMultipleListings, setLoading, setError } = listingsSlice.actions;
export default listingsSlice.reducer; 