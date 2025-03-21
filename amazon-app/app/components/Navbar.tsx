import React, { useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Ensure styles object exists with fallbacks
  const safeStyles = {
    navbar: styles?.navbar || 'navbar',
    'navbar-logo': styles?.['navbar-logo'] || 'navbar-logo',
    'navbar-toggle': styles?.['navbar-toggle'] || 'navbar-toggle',
    'burger-icon': styles?.['burger-icon'] || 'burger-icon',
    open: styles?.open || 'open',
    'nav-list': styles?.['nav-list'] || 'nav-list',
    'nav-list-open': styles?.['nav-list-open'] || 'nav-list-open',
    'nav-item': styles?.['nav-item'] || 'nav-item',
    'nav-link': styles?.['nav-link'] || 'nav-link',
  };

  return (
    <nav className={safeStyles.navbar}>
      <div className={safeStyles['navbar-logo']}>
        <Link href="/">
          <span>Amazon Inventory</span>
        </Link>
      </div>
      
      <button className={safeStyles['navbar-toggle']} onClick={toggleMenu}>
        <span className={`${safeStyles['burger-icon']} ${isOpen ? safeStyles.open : ''}`}></span>
      </button>
      
      <ul className={`${safeStyles['nav-list']} ${isOpen ? safeStyles['nav-list-open'] : ''}`}>
        <li className={safeStyles['nav-item']}>
          <Link href="/" className={safeStyles['nav-link']}>Dashboard</Link>
        </li>
        <li className={safeStyles['nav-item']}>
          <Link href="/inventory" className={safeStyles['nav-link']}>Inventory</Link>
        </li>
        <li className={safeStyles['nav-item']}>
          <Link href="/all-listings-report" className={safeStyles['nav-link']}>All Listings Report</Link>
        </li>
        <li className={safeStyles['nav-item']}>
          <Link href="/amazon-fulfilled-inventory" className={safeStyles['nav-link']}>Amazon Fulfilled Inventory</Link>
        </li>
        <li className={safeStyles['nav-item']}>
          <Link href="/identifier-changes" className={safeStyles['nav-link']}>Identifier Changes</Link>
        </li>
        <li className={safeStyles['nav-item']}>
          <Link href="/settings" className={safeStyles['nav-link']}>Settings</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 