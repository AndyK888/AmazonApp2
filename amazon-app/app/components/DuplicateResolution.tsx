'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './DuplicateResolution.module.css';

interface DuplicateItem {
  row_index: number;
  asin?: string;
  upc?: string;
  ean?: string;
  fnsku?: string;
  price?: number;
  quantity?: number;
  condition?: string;
  title?: string;
  [key: string]: any;
}

interface DuplicateIssue {
  id: number;
  file_id: number;
  created_at: string;
  updated_at: string;
  status: string;
  notes: string | null;
  duplicate_items: Record<string, DuplicateItem[]>;
}

interface RenameEntry {
  row_index: number;
  new_sku: string;
}

interface ResolutionOption {
  resolution_type: 'keep_newest' | 'keep_one' | 'merge' | 'rename';
  notes?: string;
  row_index?: number;
  field_selections?: Record<string, number>;
  renames?: RenameEntry[];
}

interface DuplicateResolutionProps {
  issueId: string;
  onResolved: (response: any) => void;
}

export default function DuplicateResolution({ issueId, onResolved }: DuplicateResolutionProps) {
  const [issue, setIssue] = useState<DuplicateIssue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ResolutionOption>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  useEffect(() => {
    fetchIssue();
  }, [issueId]);
  
  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/duplicates?id=${issueId}`);
      
      if (response.data.success) {
        setIssue(response.data.issue);
        
        // Initialize resolutions with default strategy (keep newest)
        const initialResolutions: Record<string, ResolutionOption> = {};
        Object.keys(response.data.issue.duplicate_items).forEach(sku => {
          initialResolutions[sku] = {
            resolution_type: 'keep_newest',
            notes: ''
          };
        });
        
        setResolutions(initialResolutions);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch duplicate issue');
      }
    } catch (err) {
      setError('Error loading duplicate issue');
      console.error('Error fetching duplicate issue:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResolutionChange = (sku: string, field: string, value: any) => {
    setResolutions(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: value
      }
    }));
  };
  
  const handleRowSelection = (sku: string, rowIndex: number) => {
    setResolutions(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        resolution_type: 'keep_one',
        row_index: rowIndex
      }
    }));
  };
  
  const handleFieldSelection = (sku: string, field: string, rowIndex: number) => {
    setResolutions(prev => {
      const current: Record<string, ResolutionOption> = {...prev};
      
      // Initialize if not present
      if (!current[sku]) {
        current[sku] = {
          resolution_type: 'merge',
          field_selections: {}
        };
      }
      
      // Initialize field_selections if not present
      if (!current[sku].field_selections) {
        current[sku].field_selections = {};
      }
      
      // Now safe to access
      const fieldSelections = current[sku].field_selections as Record<string, number>;
      fieldSelections[field] = rowIndex;
      
      current[sku].resolution_type = 'merge';
      
      return current;
    });
  };
  
  const handleRenameEntry = (sku: string, rowIndex: number, newSku: string) => {
    setResolutions(prev => {
      const current: Record<string, ResolutionOption> = {...prev};
      
      // Initialize if not present
      if (!current[sku]) {
        current[sku] = {
          resolution_type: 'rename',
          renames: []
        };
      }
      
      // Initialize renames if not present
      if (!current[sku].renames) {
        current[sku].renames = [];
      }
      
      // Now safe to access
      const renames = current[sku].renames as RenameEntry[];
      
      // Find existing entry or create new one
      const existingIndex = renames.findIndex(r => r.row_index === rowIndex);
      
      if (existingIndex >= 0) {
        renames[existingIndex].new_sku = newSku;
      } else {
        renames.push({
          row_index: rowIndex,
          new_sku: newSku
        });
      }
      
      current[sku].resolution_type = 'rename';
      
      return current;
    });
  };
  
  const submitResolutions = async () => {
    try {
      setSubmitting(true);
      
      const response = await axios.post(`/api/duplicates`, {
        issueId,
        resolutions
      });
      
      if (response.data.success) {
        if (onResolved) {
          onResolved(response.data);
        }
      } else {
        setError(response.data.message || 'Failed to apply resolutions');
      }
    } catch (err) {
      setError('Error submitting resolutions');
      console.error('Error resolving duplicates:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading duplicate issue details...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  if (!issue) {
    return <div className={styles.error}>No duplicate issue found</div>;
  }
  
  return (
    <div className={styles.container}>
      <h2>Duplicate SKUs Detected</h2>
      <p className={styles.infoText}>
        We found {Object.keys(issue.duplicate_items).length} SKUs with duplicates in your file. 
        Please choose how to handle each duplicate.
      </p>
      
      {Object.entries(issue.duplicate_items).map(([sku, duplicates]) => (
        <div key={sku} className={styles.duplicateGroup}>
          <h3>SKU: {sku}</h3>
          <div className={styles.resolutionOptions}>
            <div className={styles.optionGroup}>
              <h4>Choose Resolution Type:</h4>
              <select 
                value={resolutions[sku]?.resolution_type || 'keep_newest'}
                onChange={(e) => handleResolutionChange(sku, 'resolution_type', e.target.value)}
                className={styles.select}
              >
                <option value="keep_newest">Keep Newest Entry</option>
                <option value="keep_one">Keep Specific Entry</option>
                <option value="merge">Merge Fields</option>
                <option value="rename">Rename SKUs</option>
              </select>
            </div>
            
            <div className={styles.optionGroup}>
              <h4>Notes:</h4>
              <textarea
                value={resolutions[sku]?.notes || ''}
                onChange={(e) => handleResolutionChange(sku, 'notes', e.target.value)}
                placeholder="Add notes about this resolution"
                className={styles.textarea}
              />
            </div>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>ASIN</th>
                  <th>UPC</th>
                  <th>EAN</th>
                  <th>FNSKU</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((duplicate, index) => (
                  <tr key={index} className={
                    resolutions[sku]?.row_index === duplicate.row_index ? 
                    styles.selectedRow : ''
                  }>
                    <td>
                      {resolutions[sku]?.resolution_type === 'keep_one' && (
                        <input 
                          type="radio" 
                          name={`select-${sku}`}
                          checked={resolutions[sku]?.row_index === duplicate.row_index}
                          onChange={() => handleRowSelection(sku, duplicate.row_index)}
                        />
                      )}
                      
                      {resolutions[sku]?.resolution_type === 'merge' && (
                        <div className={styles.mergeControls}>
                          <button 
                            onClick={() => handleFieldSelection(sku, 'all', duplicate.row_index)}
                            className={styles.mergeButton}
                          >
                            Use All
                          </button>
                        </div>
                      )}
                      
                      {resolutions[sku]?.resolution_type === 'rename' && (
                        <input 
                          type="text"
                          placeholder="New SKU"
                          value={
                            resolutions[sku]?.renames?.find(r => r.row_index === duplicate.row_index)?.new_sku || ''
                          }
                          onChange={(e) => handleRenameEntry(sku, duplicate.row_index, e.target.value)}
                          className={styles.renameInput}
                        />
                      )}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['asin'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'asin', duplicate.row_index)
                      }
                    >
                      {duplicate.asin || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['upc'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'upc', duplicate.row_index)
                      }
                    >
                      {duplicate.upc || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['ean'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'ean', duplicate.row_index)
                      }
                    >
                      {duplicate.ean || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['fnsku'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'fnsku', duplicate.row_index)
                      }
                    >
                      {duplicate.fnsku || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['price'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'price', duplicate.row_index)
                      }
                    >
                      {duplicate.price || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['quantity'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'quantity', duplicate.row_index)
                      }
                    >
                      {duplicate.quantity || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['condition'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'condition', duplicate.row_index)
                      }
                    >
                      {duplicate.condition || '-'}
                    </td>
                    
                    <td 
                      className={
                        resolutions[sku]?.field_selections?.['title'] === duplicate.row_index || 
                        resolutions[sku]?.field_selections?.['all'] === duplicate.row_index ? 
                        styles.selectedField : ''
                      }
                      onClick={() => 
                        resolutions[sku]?.resolution_type === 'merge' && 
                        handleFieldSelection(sku, 'title', duplicate.row_index)
                      }
                    >
                      {duplicate.title || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className={styles.resolutionExplanation}>
            {resolutions[sku]?.resolution_type === 'keep_newest' && (
              <p>The most recent entry for this SKU will be kept. All other entries will be discarded.</p>
            )}
            
            {resolutions[sku]?.resolution_type === 'keep_one' && (
              <p>Only the selected entry will be kept. All other entries will be discarded.</p>
            )}
            
            {resolutions[sku]?.resolution_type === 'merge' && (
              <p>Values will be merged from multiple entries. Click on each field to select which entry to use as the source.</p>
            )}
            
            {resolutions[sku]?.resolution_type === 'rename' && (
              <p>Enter new unique SKUs for duplicate entries to keep all records.</p>
            )}
          </div>
        </div>
      ))}
      
      <div className={styles.actionsContainer}>
        <button
          className={styles.cancelButton}
          onClick={() => onResolved && onResolved({ cancelled: true })}
        >
          Cancel
        </button>
        
        <button
          className={styles.submitButton}
          onClick={submitResolutions}
          disabled={submitting}
        >
          {submitting ? 'Applying...' : 'Apply Resolutions'}
        </button>
      </div>
    </div>
  );
} 