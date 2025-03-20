import React, { useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-logo']}>
        <Link href="/">
          <span>Amazon Inventory</span>
        </Link>
      </div>
      
      <button className={styles['navbar-toggle']} onClick={toggleMenu}>
        <span className={`${styles['burger-icon']} ${isOpen ? styles.open : ''}`}></span>
      </button>
      
      <ul className={`${styles['nav-list']} ${isOpen ? styles['nav-list-open'] : ''}`}>
        <li className={styles['nav-item']}>
          <Link href="/" className={styles['nav-link']}>Dashboard</Link>
        </li>
        <li className={styles['nav-item']}>
          <Link href="/inventory" className={styles['nav-link']}>Inventory</Link>
        </li>
        <li className={styles['nav-item']}>
          <Link href="/all-listings-report" className={styles['nav-link']}>All Listings Report</Link>
        </li>
        <li className={styles['nav-item']}>
          <Link href="/amazon-fulfilled-inventory" className={styles['nav-link']}>Amazon Fulfilled Inventory</Link>
        </li>
        <li className={styles['nav-item']}>
          <Link href="/identifier-changes" className={styles['nav-link']}>Identifier Changes</Link>
        </li>
        <li className={styles['nav-item']}>
          <Link href="/settings" className={styles['nav-link']}>Settings</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar; 