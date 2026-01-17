import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import '../styles/PageCommon.css';

const Inventory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [items, setItems] = useState([]);

  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    sku: '',
    stock: 0,
    price: 0.0,
    process: ''
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

  // Simplified columns - Removed HSN, Category, Status
  const columns = [
    { header: "Product Name", accessor: "name" },
    { header: "SKU", accessor: "sku" },
    { header: "Process", accessor: "process" },
    {
      header: "Stock", accessor: "stock", render: (val) => (
        <span style={{ color: val < 50 ? 'var(--danger)' : 'var(--text-primary)' }}>{val}</span>
      )
    },
    { header: "Unit Price", accessor: "price", render: (val) => `₹${val.toFixed(2)}` },
  ];

  const showAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const handleSave = async () => {
    try {
      if (newItem.id) {
        await invoke('update_item', { item: newItem });
        showAlert('success', 'Updated!', `${newItem.name} has been updated.`);
      } else {
        await invoke('add_item', { item: newItem });
        showAlert('success', 'Added!', `${newItem.name} added to inventory.`);
      }
      setIsModalOpen(false);
      fetchInventory();
      setNewItem({ id: null, name: '', sku: '', stock: 0, price: 0.0, process: '' });
    } catch (error) {
      console.error("Failed to save item:", error);
      showAlert('error', 'Error', `Failed to save: ${error}`);
    }
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await invoke('delete_item', { id: itemToDelete.id });
      fetchInventory();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      showAlert('success', 'Deleted', 'Item removed.');
    } catch (e) {
      showAlert('error', 'Error', `Delete failed: ${e}`);
    }
  };

  const handleEdit = (item) => {
    setNewItem({ ...item });
    setIsModalOpen(true);
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
        <button className="btn-primary-glow" onClick={() => {
          setNewItem({ id: null, name: '', sku: '', stock: 0, price: 0.0, process: '' });
          setIsModalOpen(true);
        }}>
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

      {items.length === 0 ? (
        <div className="empty-state">
          <Package size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No Products Found</h3>
          <p>Add your first product to get started.</p>
        </div>
      ) : (
        <GlassTable columns={columns} data={items} actions={{ onEdit: handleEdit, onDelete: handleDelete }} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={newItem.id ? "Edit Product" : "Add New Product"}
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>SKU</label>
            <input
              type="text"
              className="form-input"
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              placeholder="e.g. SP-001"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Process</label>
            <input
              type="text"
              className="form-input"
              value={newItem.process}
              onChange={(e) => setNewItem({ ...newItem, process: e.target.value })}
              placeholder="e.g. Casting"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Stock</label>
            <input
              type="number"
              className="form-input"
              value={newItem.stock}
              onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Unit Price (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0.0 })}
              placeholder="0.00"
            />
          </div>
        </div>
      </Modal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name}
      />

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
      />
    </div>
  );
};

export default Inventory;
