import { configureStore } from '@reduxjs/toolkit';
import productsReducer, { ProductsState } from './slices/productsSlice';
import listingsReducer, { ListingsState } from './slices/listingsSlice';
import loggerMiddleware from './middleware/loggerMiddleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('Store');

export interface RootState {
  products: ProductsState;
  listings: ListingsState;
}

// Only use logger middleware in development
const middleware = process.env.NODE_ENV === 'production' 
  ? [] 
  : [loggerMiddleware];

logger.info('Configuring Redux store');

export const store = configureStore({
  reducer: {
    products: productsReducer,
    listings: listingsReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in dev environment for easier debugging
        ignoredActions: process.env.NODE_ENV !== 'production' ? ['*'] : [],
      },
    }).concat(middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

logger.info('Redux store initialized');

export type AppDispatch = typeof store.dispatch; 