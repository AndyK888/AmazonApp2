'use client';

import React from 'react';
import Navbar from './components/Navbar';
import DuplicateNotification from './components/DuplicateNotification';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Amazon Inventory Manager</title>
      </head>
      <body>
        <Navbar />
        <DuplicateNotification />
        <main>{children}</main>
      </body>
    </html>
  );
} 