'use client';

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  // Ensure styles object exists with fallbacks
  const safeStyles = {
    'home-container': styles?.['home-container'] || 'home-container',
    'features-grid': styles?.['features-grid'] || 'features-grid',
    'feature-card': styles?.['feature-card'] || 'feature-card',
  };

  return (
    <div className={safeStyles['home-container']}>
      <h1>Amazon Inventory Manager</h1>
      <p>Manage your Amazon inventory with ease</p>
      
      <div className={safeStyles['features-grid']}>
        <Link href="/inventory" className={safeStyles['feature-card']}>
          <h2>Inventory</h2>
          <p>View and manage your product inventory</p>
        </Link>
        
        <Link href="/all-listings-report" className={safeStyles['feature-card']}>
          <h2>All Listings Report</h2>
          <p>Upload and view your Amazon listings report</p>
        </Link>
        
        <Link href="/amazon-fulfilled-inventory" className={safeStyles['feature-card']}>
          <h2>Amazon Fulfilled Inventory</h2>
          <p>View your Amazon-fulfilled inventory data</p>
        </Link>
        
        <Link href="/settings" className={safeStyles['feature-card']}>
          <h2>Settings</h2>
          <p>Configure your account and preferences</p>
        </Link>
      </div>
    </div>
  );
} 