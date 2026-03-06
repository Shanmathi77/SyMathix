// frontend/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import SalesDashboard from './sales_dashboard.jsx'; // Your main component

// Create root and render the app
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SalesDashboard />
  </React.StrictMode>
);
