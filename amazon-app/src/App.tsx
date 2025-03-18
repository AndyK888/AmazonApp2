import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import './App.css';
import ProductList from './components/InventoryTable';
import AllListingReport from './components/AllListingReport';
import NavLink from './components/NavLink';
import ErrorBoundary from './components/ErrorBoundary';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

function App() {
  useEffect(() => {
    logger.info('Application initialized');
    
    // Set up global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error('Uncaught error:', event.error);
      event.preventDefault();
    };
    
    // Set up global handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router>
          <div className="App">
            <header className="App-header">
              <h1>Amazon Inventory Management</h1>
              <nav>
                <NavLink to="/">All Listing Report</NavLink>
                <NavLink to="/products">Product List</NavLink>
              </nav>
            </header>
            <main>
              <Routes>
                <Route path="/" element={
                  <ErrorBoundary>
                    <AllListingReport />
                  </ErrorBoundary>
                } />
                <Route path="/products" element={
                  <ErrorBoundary>
                    <ProductList />
                  </ErrorBoundary>
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
