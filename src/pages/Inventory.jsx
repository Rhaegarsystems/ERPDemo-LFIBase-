import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import DetailViewModal from '../components/DetailViewModal';
import '../styles/PageCommon.css';

const formatDateInput = (value) => {
  let digits = value.replace(/\D/g, '');
  digits = digits.substring(0, 8);

  let formatted = '';
  if (digits.length > 0) {
    formatted += digits.substring(0, 2);
  }
  if (digits.length > 2) {
    formatted += '-' + digits.substring(2, 4);
  }
  if (digits.length > 4) {
    formatted += '-' + digits.substring(4, 8);
  }
  return formatted;
};

const Inventory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    part_number: '',
    price: '',
    process: '',
    po_no: '',
    po_date: ''
  });

  const fetchInventory = async () => {
    try {
      const result = await invoke('get_inventory');
      const safeResult = Array.isArray(result) ? result : [];
      setItems(safeResult);
      setFilteredItems(safeResult);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setItems([]);
      setFilteredItems([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.part_number && item.part_number.toLowerCase().includes(term)) ||
        (item.process && item.process.toLowerCase().includes(term))
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);

  // Simplified columns - Removed Stock from here as well, and put Part Number first
  const columns = [
    { header: "Part Number", accessor: "part_number" },
    { header: "Product Name", accessor: "name" },
    { header: "Process", accessor: "process" },
    { header: "Unit Price", accessor: "price", render: (val) => `₹${(typeof val === 'number' ? val : 0).toFixed(2)}` },
  ];

  const showAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const handleSave = async () => {
    try {
      const itemToSave = {
        ...newItem,
        part_number: newItem.part_number || null,
        price: parseFloat(newItem.price) || 0.0
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
      setNewItem({ id: null, name: '', part_number: '', price: '', process: '', po_no: '', po_date: '' });
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
    { key: 'po_no', label: 'PO No' },
    { key: 'po_date', label: 'PO Date' },
    { key: 'price', label: 'Unit Price', render: (val) => `₹${val?.toFixed(2) || '0.00'}` },
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Parts
          </h1>
          <p className="page-subtitle">Manage your parts.</p>
        </div>
        <button className="btn-primary-glow" onClick={() => {
          setNewItem({ id: null, name: '', part_number: '', price: 0.0, process: '', po_no: '', po_date: '' });
          setIsModalOpen(true);
        }}>
          <Plus size={18} /> Add Product
        </button>
      </header>

      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-glass">
          <Filter size={18} /> Filter
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <Package size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No Products Found</h3>
          <p>{searchTerm ? "No products match your search." : "Add your first product to get started."}</p>
        </div>
      ) : (
        <GlassTable
          columns={columns}
          data={filteredItems}
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
              type="text"
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
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>PO Number</label>
            <input
              type="text"
              className="form-input"
              value={newItem.po_no}
              onChange={(e) => setNewItem({ ...newItem, po_no: e.target.value })}
              placeholder="e.g. PO/2024/001"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>PO Date</label>
            <input
              type="text"
              className="form-input"
              value={newItem.po_date}
              onChange={(e) => setNewItem({ ...newItem, po_date: formatDateInput(e.target.value) })}
              placeholder="DD-MM-YYYY"
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
