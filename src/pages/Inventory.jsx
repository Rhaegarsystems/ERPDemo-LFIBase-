import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import '../styles/PageCommon.css';

const Inventory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [items, setItems] = useState([]); // Real data state

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: '',
    stock: 0,
    price: 0.0,
    status: 'In Stock'
  });

  const fetchInventory = async () => {
    try {
      const result = await invoke('get_inventory');
      setItems(result);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const columns = [
    { header: "Product Name", accessor: "name" },
    { header: "SKU", accessor: "sku" },
    { header: "Category", accessor: "category" },
    {
      header: "Stock Level", accessor: "stock", render: (val) => (
        <span style={{ color: val < 50 ? 'var(--danger)' : 'var(--text-primary)' }}>{val}</span>
      )
    },
    { header: "Unit Price", accessor: "price", render: (val) => `$${val.toFixed(2)}` },
    {
      header: "Status", accessor: "status", render: (status) => (
        <span className={`badge ${status.toLowerCase().replace(/ /g, '-')}`}>
          {status}
        </span>
      )
    },
  ];

  const handleSave = async () => {
    try {
      await invoke('add_item', { item: newItem });
      setIsModalOpen(false);
      fetchInventory(); // Refresh data
      // Reset form
      setNewItem({ name: '', sku: '', category: '', stock: 0, price: 0.0, status: 'In Stock' });
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Error adding item: " + error);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-title"
          >
            Inventory
          </motion.h1>
          <p className="page-subtitle">Manage your products and stock levels.</p>
        </div>
        <button className="btn-primary-glow" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Product
        </button>
      </header>

      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search products..." />
        </div>
        <button className="btn-glass">
          <Filter size={18} /> Filter
        </button>
      </div>

      <GlassTable columns={columns} data={items} actions={true} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Product"
        actions={
          <>
            <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary-glow" onClick={handleSave}>Save Product</button>
          </>
        }
      >
        <div className="form-group">
          <label>Product Name</label>
          <input
            type="text"
            className="form-input"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="e.g. Steel Pipe"
          />
        </div>
        <div className="form-group">
          <label>SKU</label>
          <input
            type="text"
            className="form-input"
            value={newItem.sku}
            onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
            placeholder="e.g. SP-001"
          />
        </div>
        <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group w-full" style={{ flex: 1 }}>
            <label>Category</label>
            <input
              type="text"
              className="form-input"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              placeholder="e.g. Hardware"
            />
          </div>
          <div className="form-group w-full" style={{ flex: 1 }}>
            <label>Initial Stock</label>
            <input
              type="number"
              className="form-input"
              value={newItem.stock}
              onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Unit Price ($)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0.0 })}
            placeholder="0.00"
          />
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
