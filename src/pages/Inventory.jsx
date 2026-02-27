import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import DetailViewModal from '../components/DetailViewModal';
import '../styles/PageCommon.css';

const Inventory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [items, setItems] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    part_number: '',
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

  // Simplified columns - Removed Stock from here as well, and put Part Number first
  const columns = [
    { header: "Part Number", accessor: "part_number" },
    { header: "Product Name", accessor: "name" },
    { header: "Process", accessor: "process" },
    { header: "Unit Price", accessor: "price", render: (val) => `₹${val.toFixed(2)}` },
  ];

  const showAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const handleSave = async () => {
    try {
      const itemToSave = {
        ...newItem,
        part_number: parseInt(newItem.part_number) || null
      };
      if (newItem.id) {
        await invoke('update_item', { item: itemToSave });
        showAlert('success', 'Updated!', `${newItem.name} has been updated.`);
      } else {
        await invoke('add_item', { item: itemToSave });
        showAlert('success', 'Added!', `${newItem.name} added to inventory.`);
      }
      setIsModalOpen(false);
      fetchInventory();
      setNewItem({ id: null, name: '', part_number: '', price: 0.0, process: '' });
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

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const detailFields = [
    { key: 'name', label: 'Part Name' },
    { key: 'part_number', label: 'Part Number' },
    { key: 'process', label: 'Process' },
    { key: 'price', label: 'Unit Price', render: (val) => `₹${val?.toFixed(2) || '0.00'}` },
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="page-title"
          >
            Parts
          </motion.h1>
          <p className="page-subtitle">Manage your parts.</p>
        </div>
        <button className="btn-primary-glow" onClick={() => {
          setNewItem({ id: null, name: '', part_number: '', price: 0.0, process: '' });
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
        <GlassTable
          columns={columns}
          data={items}
          actions={{ onEdit: handleEdit, onDelete: handleDelete }}
          onRowClick={handleRowClick}
        />
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
            <label>Part Number</label>
            <input
              type="number"
              className="form-input"
              value={newItem.part_number}
              onChange={(e) => setNewItem({ ...newItem, part_number: e.target.value })}
              placeholder="e.g. 1001"
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

      <DetailViewModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Part Details"
        data={selectedItem}
        fields={detailFields}
      />
    </div>
  );
};

export default Inventory;
