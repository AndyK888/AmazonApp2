import React, { useMemo, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateListing, addListing, addMultipleListings } from '../store/slices/listingsSlice';
import { RootState } from '../store';
import { Listing } from '../store/slices/listingsSlice';
import FileUploader from './FileUploader';
import { UppyFile } from '@uppy/core';
import { createLogger } from '../utils/logger';
import { globalErrorHandler } from '../utils/errorHandler';

// Register Handsontable modules
registerAllModules();

// Create logger instance
const logger = createLogger('AllListingReport');

const AllListingReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const listings = useAppSelector((state: RootState) => state.listings.items);
  const loading = useAppSelector((state: RootState) => state.listings.loading);
  const [parseError, setParseError] = useState<string | null>(null);

  // Create a deep copy of the data for Handsontable to safely modify
  const listingsData = useMemo(() => 
    listings.map((item: Listing) => ({...item})), 
    [listings]
  );

  const handleChange = (changes: any[] | null) => {
    if (!changes) return;
    
    // Only dispatch changes to Redux after Handsontable has updated its internal state
    changes.forEach(([row, prop, oldValue, newValue]) => {
      if (oldValue !== newValue) {
        dispatch(updateListing({
          index: row,
          data: { [prop]: newValue }
        }));
      }
    });
  };

  const handleAddRow = () => {
    dispatch(addListing());
  };

  // Handle files uploaded through FileUploader
  const handleFilesUploaded = async (files: UppyFile<{}, {}>[]) => {
    if (files.length === 0) return;
    
    try {
      const file = files[0];
      logger.info(`Processing uploaded file: ${file.name}`);
      
      // Reset any previous errors
      setParseError(null);
      
      // Get file data
      const fileData = await readFileContents(file);
      if (!fileData) {
        setParseError('Could not read file contents.');
        return;
      }
      
      // Parse the file based on its extension
      const parsedListings = parseFileData(fileData, file.name || 'unknown.txt');
      
      if (parsedListings.length > 0) {
        logger.info(`Successfully parsed ${parsedListings.length} listings from file.`);
        dispatch(addMultipleListings(parsedListings));
      } else {
        setParseError('No valid listings found in the file.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error processing file:', error);
      setParseError(`Error processing file: ${errorMessage}`);
      globalErrorHandler(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // Read file contents as text
  const readFileContents = async (file: UppyFile<{}, {}>): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.data || !(file.data instanceof Blob)) {
        resolve(null);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        logger.error('Error reading file:', reader.error);
        resolve(null);
      };
      reader.readAsText(file.data);
    });
  };

  // Parse file data based on file type
  const parseFileData = (fileData: string, fileName: string): Listing[] => {
    const listings: Listing[] = [];
    
    try {
      // Determine file type from extension and ensure it's not undefined
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt';
      
      // Split file into lines
      const lines = fileData.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        logger.warn('File contains no data');
        return listings;
      }
      
      // Parse header row to get column indexes
      const headers = parseDelimitedLine(lines[0], fileExtension);
      
      // Map header indexes
      const columnMap = mapHeadersToColumns(headers);
      
      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const row = parseDelimitedLine(lines[i], fileExtension);
        
        if (row.length < headers.length) continue;
        
        const listing: any = {};
        
        // Map values to appropriate fields
        Object.entries(columnMap).forEach(([field, index]) => {
          if (index !== -1 && row[index]) {
            listing[field] = row[index];
          }
        });
        
        // Ensure required fields
        if (listing.sku) {
          listings.push(listing as Listing);
        }
      }
    } catch (error) {
      logger.error('Error parsing file data:', error);
      throw new Error('Failed to parse file data');
    }
    
    return listings;
  };

  // Parse a line based on file extension
  const parseDelimitedLine = (line: string, fileExtension: string): string[] => {
    switch (fileExtension) {
      case 'csv':
        return parseCSVLine(line);
      case 'tsv':
        return line.split('\t');
      case 'txt':
      default:
        // Try to auto-detect delimiter
        if (line.includes('\t')) {
          return line.split('\t');
        } else if (line.includes(',')) {
          return parseCSVLine(line);
        } else {
          // Fallback to splitting by whitespace
          return line.split(/\s+/);
        }
    }
  };
  
  // Parse CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i < line.length - 1 && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    result.push(currentField);
    
    return result;
  };
  
  // Map headers to column indexes
  const mapHeadersToColumns = (headers: string[]): Record<string, number> => {
    const columnMap: Record<string, number> = {
      sku: -1,
      asin: -1,
      price: -1,
      quantity: -1,
      condition: -1,
      fulfillmentChannel: -1,
      status: -1,
      openDate: -1,
      itemName: -1,
      category: -1
    };
    
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      if (normalizedHeader.includes('sku')) columnMap.sku = index;
      else if (normalizedHeader.includes('asin')) columnMap.asin = index;
      else if (normalizedHeader.includes('price')) columnMap.price = index;
      else if (normalizedHeader.includes('quantity') || normalizedHeader.includes('qty')) columnMap.quantity = index;
      else if (normalizedHeader.includes('condition')) columnMap.condition = index;
      else if (normalizedHeader.includes('fulfillment') || normalizedHeader.includes('channel')) columnMap.fulfillmentChannel = index;
      else if (normalizedHeader.includes('status')) columnMap.status = index;
      else if (normalizedHeader.includes('date') || normalizedHeader.includes('open')) columnMap.openDate = index;
      else if (normalizedHeader.includes('name') || normalizedHeader.includes('title')) columnMap.itemName = index;
      else if (normalizedHeader.includes('category')) columnMap.category = index;
    });
    
    return columnMap;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="all-listing-report-container">
      <div className="report-header">
        <h2>All Listing Report</h2>
        <button className="add-row-btn" onClick={handleAddRow}>Add Row</button>
      </div>
      
      <FileUploader onFilesUploaded={handleFilesUploaded} />
      
      {parseError && (
        <div className="uploader-error">
          {parseError}
        </div>
      )}
      
      <HotTable
        data={listingsData}
        colHeaders={[
          'SKU', 
          'ASIN', 
          'Price', 
          'Quantity', 
          'Condition', 
          'Fulfillment Channel', 
          'Status', 
          'Open Date', 
          'Item Name', 
          'Category'
        ]}
        columns={[
          { data: 'sku' },
          { data: 'asin' },
          { data: 'price' },
          { data: 'quantity' },
          { data: 'condition' },
          { data: 'fulfillmentChannel' },
          { data: 'status' },
          { data: 'openDate' },
          { data: 'itemName' },
          { data: 'category' }
        ]}
        rowHeaders={true}
        height="600px"
        width="100%"
        licenseKey="non-commercial-and-evaluation"
        stretchH="all"
        afterChange={handleChange}
        contextMenu={true}
      />
    </div>
  );
};

export default AllListingReport; 