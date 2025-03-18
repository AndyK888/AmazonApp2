import React, { useMemo } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateProduct, addProduct, Product } from '../store/slices/productsSlice';
import { RootState } from '../store';

// Register Handsontable modules
registerAllModules();

const ProductList: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.products.items);
  const loading = useAppSelector((state: RootState) => state.products.loading);

  // Create a deep copy of the data for Handsontable to safely modify
  const productsData = useMemo(() => 
    products.map((item: Product) => ({...item})), 
    [products]
  );

  const handleChange = (changes: any[] | null) => {
    if (!changes) return;
    
    // Only dispatch changes to Redux after Handsontable has updated its internal state
    changes.forEach(([row, prop, oldValue, newValue]) => {
      if (oldValue !== newValue) {
        dispatch(updateProduct({
          index: row,
          data: { [prop]: newValue }
        }));
      }
    });
  };

  const handleAddRow = () => {
    dispatch(addProduct());
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="product-list-container">
      <div className="report-header">
        <h2>Product List</h2>
        <button className="add-row-btn" onClick={handleAddRow}>Add Row</button>
      </div>
      <HotTable
        data={productsData}
        columns={[
          { data: 'sku' },
          { data: 'quantity' },
          { data: 'asin' },
          { data: 'fnsku' },
          { data: 'ean' },
          { data: 'upc' }
        ]}
        colHeaders={['SKU', 'Quantity', 'ASIN', 'FNSKU', 'EAN', 'UPC']}
        rowHeaders={true}
        height="500px"
        width="100%"
        licenseKey="non-commercial-and-evaluation"
        afterChange={handleChange}
        stretchH="all"
        contextMenu={true}
      />
    </div>
  );
};

export default ProductList; 