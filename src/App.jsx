import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="stock" element={<Stock />} />
          <Route path="customers" element={<Customers />} />
          <Route path="invoices" element={<Invoices />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
