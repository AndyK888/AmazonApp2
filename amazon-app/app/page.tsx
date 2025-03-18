'use client';

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles['home-container']}>
      <h1>Amazon Inventory Manager</h1>
      <p>Manage your Amazon inventory with ease</p>
      
      <div className={styles['features-grid']}>
        <Link href="/inventory" className={styles['feature-card']}>
          <h2>Inventory</h2>
          <p>View and manage your product inventory</p>
        </Link>
        
        <Link href="/all-listings-report" className={styles['feature-card']}>
          <h2>All Listings Report</h2>
          <p>Upload and view your Amazon listings report</p>
        </Link>
        
        <Link href="/settings" className={styles['feature-card']}>
          <h2>Settings</h2>
          <p>Configure your account and preferences</p>
        </Link>
      </div>
    </div>
  );
} 