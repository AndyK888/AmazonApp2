import { Pool, QueryResult } from 'pg';
import { createLogger } from '../utils/logger';

const logger = createLogger('DatabaseService');

// Create a connection pool using environment variables or default values
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/amazon_inventory',
  // Maximum number of clients the pool should contain
  max: 20,
  // Maximum time (milliseconds) a client will stay idle before being closed
  idleTimeoutMillis: 30000,
  // Maximum time (milliseconds) to wait for a connection to become available
  connectionTimeoutMillis: 2000,
});

// Handle connection events
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Generic query executor with logging
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
};

// Listing type definition
export interface Listing {
  id?: number;
  sku: string;
  asin?: string;
  fnsku?: string;
  ean?: string;
  upc?: string;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
}

// Listing-specific functions
export const getListings = async (): Promise<Listing[]> => {
  try {
    const result = await query('SELECT * FROM listings ORDER BY sku');
    return result.rows;
  } catch (error) {
    logger.error('Error fetching listings', error);
    throw error;
  }
};

export const getListingById = async (id: number): Promise<Listing | null> => {
  try {
    const result = await query('SELECT * FROM listings WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error fetching listing with id ${id}`, error);
    throw error;
  }
};

export const createListing = async (listing: Listing): Promise<Listing> => {
  const { sku, asin, fnsku, ean, upc, quantity } = listing;
  try {
    const result = await query(
      'INSERT INTO listings (sku, asin, fnsku, ean, upc, quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [sku, asin, fnsku, ean, upc, quantity || 0]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating listing', error);
    throw error;
  }
};

export const updateListing = async (id: number, listing: Partial<Listing>): Promise<Listing | null> => {
  const { sku, asin, fnsku, ean, upc, quantity } = listing;
  try {
    const result = await query(
      'UPDATE listings SET sku = $1, asin = $2, fnsku = $3, ean = $4, upc = $5, quantity = $6 WHERE id = $7 RETURNING *',
      [sku, asin, fnsku, ean, upc, quantity, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating listing with id ${id}`, error);
    throw error;
  }
};

export const deleteListing = async (id: number): Promise<Listing | null> => {
  try {
    const result = await query('DELETE FROM listings WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`Error deleting listing with id ${id}`, error);
    throw error;
  }
};

export const bulkInsertListings = async (listings: Listing[]): Promise<Listing[]> => {
  // Start a transaction for bulk insert
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const insertPromises = listings.map(listing => {
      const { sku, asin, fnsku, ean, upc, quantity } = listing;
      return client.query(
        'INSERT INTO listings (sku, asin, fnsku, ean, upc, quantity) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (sku) DO UPDATE SET asin = $2, fnsku = $3, ean = $4, upc = $5, quantity = $6 RETURNING *',
        [sku, asin, fnsku, ean, upc, quantity || 0]
      );
    });
    
    const results = await Promise.all(insertPromises);
    await client.query('COMMIT');
    
    logger.info(`Bulk inserted ${results.length} listings`);
    return results.map(result => result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error during bulk insert', error);
    throw error;
  } finally {
    client.release();
  }
};

export default {
  query,
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  bulkInsertListings,
}; 