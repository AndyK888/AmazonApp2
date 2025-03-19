'use client';

import React from 'react';
import InventoryTable from '../components/InventoryTable';
import styles from './page.module.css';

export default function InventoryPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Inventory Management</h1>
      <p className={styles.description}>
        Edit and manage your inventory items. All changes are automatically saved.
      </p>
      <div className={styles.tableContainer}>
        <InventoryTable />
      </div>
    </div>
  );
} 