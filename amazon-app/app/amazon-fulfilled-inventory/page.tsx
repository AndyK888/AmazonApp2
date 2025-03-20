'use client';

import React, { useEffect, useState } from 'react';
import FileUploader from '../components/FileUploader';
import axios from 'axios';
import { InventoryItem, InventoryStatistics, PaginationData, InventoryResponse, ReportUploadResponse } from '@/types/inventory';
import styles from './page.module.css';

export default function AmazonFulfilledInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'sku', 'asin', 'fnsku', 'product_name', 'fulfillable_quantity', 'quantity'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // State for filtering, searching, and pagination
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 100
  });
  const [searchInputValue, setSearchInputValue] = useState('');

  // Stats
  const [stats, setStats] = useState<InventoryStatistics | null>(null);

  // Get filter options
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fetch condition options for dropdown
    const fetchConditionOptions = async () => {
      try {
        const response = await axios.get('/api/amazon-fulfilled-inventory/conditions');
        if (response.data && Array.isArray(response.data)) {
          setConditionOptions(response.data);
        }
      } catch (err) {
        console.error('Error fetching condition options:', err);
      }
    };

    fetchConditionOptions();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        
        // Build query parameters for API request
        const params = new URLSearchParams();
        params.append('page', pagination.currentPage.toString());
        params.append('limit', pagination.pageSize.toString());
        
        if (search) {
          params.append('search', search);
        }
        
        if (condition) {
          params.append('condition', condition);
        }
        
        const response = await axios.get<InventoryResponse>(`/api/amazon-fulfilled-inventory?${params.toString()}`);
        setInventory(response.data.items);
        setPagination(response.data.pagination);
        setError(null);

        // Fetch statistics
        fetchStats();
      } catch (err) {
        setError('Failed to fetch inventory. Please try again later.');
        console.error('Error fetching inventory:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [pagination.currentPage, search, condition, refreshTrigger]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/amazon-fulfilled-inventory/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching inventory statistics:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInputValue);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on new search
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCondition(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  const handleChangePage = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleUploadComplete = (response: ReportUploadResponse) => {
    // Refresh inventory after successful upload
    setRefreshTrigger(prev => prev + 1);
  };

  // All available columns for Amazon Fulfilled Inventory
  const allColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'asin', label: 'ASIN' },
    { key: 'fnsku', label: 'FNSKU' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'condition', label: 'Condition' },
    { key: 'quantity', label: 'Total Quantity' },
    { key: 'fulfillable_quantity', label: 'Fulfillable Quantity' },
    { key: 'unfulfillable_quantity', label: 'Unfulfillable Quantity' },
    { key: 'reserved_quantity', label: 'Reserved Quantity' },
    { key: 'inbound_working_quantity', label: 'Inbound Working' },
    { key: 'inbound_shipped_quantity', label: 'Inbound Shipped' },
    { key: 'inbound_receiving_quantity', label: 'Inbound Receiving' },
    { key: 'updated_at', label: 'Last Updated' }
  ];

  const toggleColumnVisibility = (columnKey: string) => {
    if (visibleColumns.includes(columnKey)) {
      setVisibleColumns(visibleColumns.filter(col => col !== columnKey));
    } else {
      setVisibleColumns([...visibleColumns, columnKey]);
    }
  };

  const toggleAllColumns = () => {
    if (visibleColumns.length === allColumns.length) {
      // Show only default columns if all are currently visible
      setVisibleColumns(['sku', 'asin', 'fnsku', 'product_name', 'fulfillable_quantity', 'quantity']);
    } else {
      // Show all columns
      setVisibleColumns(allColumns.map(col => col.key));
    }
  };

  // Format value for display based on data type
  const formatCellValue = (item: InventoryItem, column: string) => {
    const value = item[column as keyof InventoryItem];
    
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    
    if (column === 'updated_at' && typeof value === 'string') {
      const date = new Date(value);
      return date.toLocaleString();
    }
    
    return String(value);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const maxPageButtons = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;
    
    if (endPage > pagination.totalPages) {
      endPage = pagination.totalPages;
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const displayingText = pagination.totalCount > 0 
    ? `Displaying ${(pagination.currentPage - 1) * pagination.pageSize + 1} to ${Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of ${pagination.totalCount} items`
    : 'No inventory items found';

  return (
    <div className={styles['amazon-fulfilled-inventory-container']}>
      <h1>Amazon Fulfilled Inventory</h1>
      
      <FileUploader 
        onUploadComplete={handleUploadComplete}
        onUploadError={(errorMsg) => setError(errorMsg)}
        apiEndpoint="/api/amazon-fulfilled-inventory/upload"
        statusEndpoint="/api/amazon-fulfilled-inventory/upload/status"
      />
      
      {error && (
        <div className={styles['error-message']}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {/* Statistics */}
      {stats && (
        <div className={styles['stats-container']}>
          <div className={styles['stat-card']}>
            <h3>Total SKUs</h3>
            <p>{stats.total_skus}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Fulfillable Quantity</h3>
            <p>{stats.total_fulfillable}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Unfulfillable</h3>
            <p>{stats.total_unfulfillable}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Reserved</h3>
            <p>{stats.total_reserved}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Inbound (Total)</h3>
            <p>{stats.total_inbound_working + stats.total_inbound_shipped + stats.total_inbound_receiving}</p>
          </div>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className={styles['filters-container']}>
        <div className={styles['search-container']}>
          <form onSubmit={handleSearch}>
            <input 
              type="text" 
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Search by SKU, ASIN, or product name"
            />
            <button type="submit">Search</button>
          </form>
        </div>
        
        <select 
          className={styles['filter-select']}
          value={condition}
          onChange={handleConditionChange}
        >
          <option value="">All Conditions</option>
          {conditionOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <div className={styles['column-selector']}>
          <button 
            className={styles['column-button']}
            onClick={() => setShowColumnSelector(!showColumnSelector)}
          >
            Columns {showColumnSelector ? '▲' : '▼'}
          </button>
          
          {showColumnSelector && (
            <div className={styles['column-list']}>
              {allColumns.map((column) => (
                <label key={column.key}>
                  <input 
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumnVisibility(column.key)}
                  />
                  {column.label}
                </label>
              ))}
              <div className={styles['column-actions']}>
                <button onClick={toggleAllColumns}>
                  {visibleColumns.length === allColumns.length ? 'Reset to Default' : 'Select All'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Inventory Table */}
      <div className={styles['table-container']}>
        {isLoading ? (
          <div className={styles['loading-spinner']}>
            <p>Loading inventory data...</p>
          </div>
        ) : inventory.length > 0 ? (
          <table className={styles['inventory-table']}>
            <thead>
              <tr>
                {allColumns
                  .filter((column) => visibleColumns.includes(column.key))
                  .map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, index) => (
                <tr key={`${item.sku}-${index}`}>
                  {allColumns
                    .filter((column) => visibleColumns.includes(column.key))
                    .map((column) => (
                      <td key={`${item.sku}-${column.key}`}>
                        {formatCellValue(item, column.key)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles['loading-spinner']}>
            <p>No inventory data found.</p>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {inventory.length > 0 && (
        <div className={styles['pagination']}>
          <div className={styles['page-info']}>
            {displayingText}
          </div>
          
          <div className={styles['page-controls']}>
            <button 
              onClick={() => handleChangePage(1)}
              disabled={pagination.currentPage === 1}
            >
              &laquo;
            </button>
            
            <button 
              onClick={() => handleChangePage(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              &lsaquo;
            </button>
            
            {getPageNumbers().map((pageNumber) => (
              <button 
                key={pageNumber}
                onClick={() => handleChangePage(pageNumber)}
                className={pagination.currentPage === pageNumber ? styles['active'] : ''}
              >
                {pageNumber}
              </button>
            ))}
            
            <button 
              onClick={() => handleChangePage(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              &rsaquo;
            </button>
            
            <button 
              onClick={() => handleChangePage(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 