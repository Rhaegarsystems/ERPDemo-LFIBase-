import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import FormSideSheet from '../components/FormSideSheet';
import DetailViewModal from '../components/DetailViewModal';
import FilterSideSheet from '../components/FilterSideSheet';
import { useToast } from '../components/ToastProvider';
import { useConfirmToast } from '../components/ConfirmToastProvider';
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
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    process: '',
    priceMin: '',
    priceMax: '',
    createdFrom: '',
    createdTo: '',
    modifiedFrom: '',
    modifiedTo: ''
  });
  const [filteredItems, setFilteredItems] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const toast = useToast();
  const confirmToast = useConfirmToast();
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
    let result = items;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.part_number && item.part_number.toLowerCase().includes(term)) ||
        (item.process && item.process.toLowerCase().includes(term))
      );
    }
    if (filters.process) {
      result = result.filter(item => item.process === filters.process);
    }
    if (filters.priceMin) {
      result = result.filter(item => item.price >= parseFloat(filters.priceMin));
    }
    if (filters.priceMax) {
      result = result.filter(item => item.price <= parseFloat(filters.priceMax));
    }
    if (filters.createdFrom || filters.createdTo) {
      result = result.filter(item => {
        if (!item.created_at) return false;
        const created = item.created_at.split(' ')[0];
        if (filters.createdFrom && created < filters.createdFrom) return false;
        if (filters.createdTo && created > filters.createdTo) return false;
        return true;
      });
    }
    if (filters.modifiedFrom || filters.modifiedTo) {
      result = result.filter(item => {
        if (!item.updated_at) return false;
        const modified = item.updated_at.split(' ')[0];
        if (filters.modifiedFrom && modified < filters.modifiedFrom) return false;
        if (filters.modifiedTo && modified > filters.modifiedTo) return false;
        return true;
      });
    }
    setFilteredItems(result);
  }, [searchTerm, filters, items]);

  const uniqueProcesses = [...new Set(items.map(item => item.process).filter(Boolean))];

  // Simplified columns - Removed Stock from here as well, and put Part Number first
  const columns = [
    { header: "Part Number", accessor: "part_number" },
    { header: "Product Name", accessor: "name" },
    { header: "Process", accessor: "process" },
    { header: "Unit Price", accessor: "price", render: (val) => `₹${(typeof val === 'number' ? val : 0).toFixed(2)}` },
  ];

  const handleSave = async () => {
    if (!newItem.id && items.length >= 10) {
      toast.error('Demo Limit Attained', 'You can only add up to 10 parts in this demo version.');
      return;
    }
    try {
      const partNum = newItem.part_number === undefined ? '' : String(newItem.part_number).trim();
      const itemToSave = {
        id: newItem.id,
        name: newItem.name,
        part_number: partNum === '' ? null : partNum,
        price: parseFloat(newItem.price) || 0.0,
        process: newItem.process || '',
        po_no: newItem.po_no || null,
        po_date: newItem.po_date || null
      };
      if (newItem.id) {
        await invoke('update_item', { item: itemToSave });
        toast.success('Updated!', `${newItem.name} has been updated.`);
      } else {
        await invoke('add_item', { item: itemToSave });
        toast.success('Added!', `${newItem.name} added to RhaegarSystems ERP.`);
      }
      setIsModalOpen(false);
      fetchInventory();
      setNewItem({ id: null, name: '', part_number: '', price: '', process: '', po_no: '', po_date: '' });
    } catch (error) {
      console.error("Failed to save item:", error);
      const errorStr = String(error);
      if (errorStr.toLowerCase().includes('unique') || errorStr.includes('UNIQUE constraint') || errorStr.includes('InvalidQuery')) {
        toast.error('Duplicate Part Number', 'This part number already exists. Please use a different part number.');
      } else {
        toast.error('Error', `Failed to save: ${error}`);
      }
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await confirmToast.showConfirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${item.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await invoke('delete_item', { id: item.id });
        fetchInventory();
        toast.success('Deleted', 'Item removed.');
      } catch (e) {
        toast.error('Error', `Delete failed: ${e}`);
      }
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
    { key: 'created_at', label: 'Created on' },
    { key: 'updated_at', label: 'Modified on' },
  ];

  return (
    <div className="page-container">
      <header className="dashboard-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
        <div style={{ marginTop: 0 }}>
          <h1 className="greeting-text" style={{ marginTop: 0 }}>Parts</h1>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your parts</p>
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
        <button className="btn-glass" onClick={() => setIsFilterOpen(true)}>
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

      <FormSideSheet
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
        <div className="form-group">
          <label>Part Number</label>
          <input
            type="text"
            className="form-input"
            value={newItem.part_number}
            onChange={(e) => setNewItem({ ...newItem, part_number: e.target.value })}
            placeholder="e.g. 1001"
          />
        </div>
        <div className="form-group">
          <label>Process</label>
          <input
            type="text"
            className="form-input"
            value={newItem.process}
            onChange={(e) => setNewItem({ ...newItem, process: e.target.value })}
            placeholder="e.g. Casting"
          />
        </div>
        <div className="form-group">
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
        <div className="form-group">
          <label>PO Number</label>
          <input
            type="text"
            className="form-input"
            value={newItem.po_no}
            onChange={(e) => setNewItem({ ...newItem, po_no: e.target.value })}
            placeholder="e.g. PO/2024/001"
          />
        </div>
        <div className="form-group">
          <label>PO Date</label>
<input
              type="text"
              className="form-input"
              value={newItem.po_date}
              onChange={(e) => setNewItem({ ...newItem, po_date: formatDateInput(e.target.value) })}
              placeholder="DD-MM-YYYY"
            />
        </div>
      </FormSideSheet>

      <DetailViewModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Part Details"
        data={selectedItem}
        fields={detailFields}
      />

      <FilterSideSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        onClear={() => setFilters({ process: '', priceMin: '', priceMax: '', createdFrom: '', createdTo: '', modifiedFrom: '', modifiedTo: '' })}
        filters={filters}
        processes={uniqueProcesses}
      />
    </div>
  );
};

export default Inventory;
