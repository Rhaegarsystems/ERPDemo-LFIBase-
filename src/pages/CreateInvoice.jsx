import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Printer, ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toWords } from 'number-to-words';
import AlertModal from '../components/AlertModal';
import PartSelectorModal from '../components/PartSelectorModal';
import CustomerSelectorModal from '../components/CustomerSelectorModal';
import '../styles/PageCommon.css';
import lfiLogo from '../assets/Logo.png';

// Helper: Format date input with auto-hyphen (DD-MM-YYYY)
const formatDateInput = (value) => {
    // Remove all non-digits
    let digits = value.replace(/\D/g, '');

    // Limit to 8 digits (DDMMYYYY)
    digits = digits.substring(0, 8);

    // Add hyphens automatically
    if (digits.length >= 4) {
        return `${digits.substring(0, 2)}-${digits.substring(2, 4)}-${digits.substring(4)}`;
    } else if (digits.length >= 2) {
        return `${digits.substring(0, 2)}-${digits.substring(2)}`;
    }
    return digits;
};

// Convert DD-MM-YYYY to YYYY-MM-DD for storage
const toISODate = (ddmmyyyy) => {
    if (!ddmmyyyy || ddmmyyyy.length < 10) return ddmmyyyy;
    const parts = ddmmyyyy.split('-');
    if (parts.length === 3 && parts[0].length === 2) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy;
};

// Convert YYYY-MM-DD to DD-MM-YYYY for display
const toDisplayDate = (isoDate) => {
    if (!isoDate || isoDate.length < 10) return isoDate || '';
    const parts = isoDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDate;
};

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const invoiceRef = useRef(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [pdfProgress, setPdfProgress] = useState({ isGenerating: false, progress: 0, status: '' });

    const [customers, setCustomers] = useState([]);
    const [inventory, setInventory] = useState([]);

    // Invoice State with V2 fields
    const [invoice, setInvoice] = useState({
        id: `INV-${Math.floor(Math.random() * 10000)}`,
        client_name: '',
        client_details: null,
        vendor_code: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        dc_no: '',
        dc_date: '',
        po_no: '',
        po_date: '',
        transport_mode: '',
        invoice_type: '', // 'Sale' or 'Service' - blank by default
        hsn_code: '',
        sac_code: '',
        state: 'Tamilnadu',
        state_code: '33',
        status: 'Pending',
        items: []
    });

    const [totals, setTotals] = useState({ subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

    // State for Part Selector Modal and New Item Form
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        sku: '',
        name: '',
        process: '',
        qty: 1,
        rate: 0
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const cust = await invoke('get_customers');
                const inv = await invoke('get_inventory');
                setCustomers(cust);
                setInventory(inv);

                if (id) {
                    const invData = await invoke('get_invoice', { id });
                    let parsedItems = [];
                    try { parsedItems = JSON.parse(invData.items_json); } catch (e) { }
                    const client = cust.find(c => c.name === invData.client_name);
                    setInvoice({
                        ...invData,
                        items: parsedItems,
                        client_details: client || null,
                        vendor_code: invData.vendor_code || client?.vendor_code || '',
                        invoice_type: invData.invoice_type || 'Sale',
                        hsn_code: invData.hsn_code || '',
                        sac_code: invData.sac_code || '',
                        state: client?.state || 'Tamilnadu',
                        state_code: client?.state_code || '33'
                    });
                }
            } catch (e) {
                console.error("Failed to load data", e);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        const sub = invoice.items.reduce((acc, item) => acc + (item.amount || 0), 0);
        let c_tax = 0, s_tax = 0, i_tax = 0;
        const isLocal = invoice.state_code === '33';
        if (sub > 0) {
            if (isLocal) { c_tax = sub * 0.09; s_tax = sub * 0.09; }
            else { i_tax = sub * 0.18; }
        }
        setTotals({ subtotal: sub, cgst: c_tax, sgst: s_tax, igst: i_tax, total: sub + c_tax + s_tax + i_tax });
    }, [invoice.items, invoice.state_code]);

    const showAlert = (type, title, message) => setAlertConfig({ isOpen: true, type, title, message });

    const handleCustomerSelect = (customer) => {
        setInvoice(prev => ({
            ...prev,
            client_name: customer.name,
            client_details: customer,
            vendor_code: customer.vendor_code || '',
            state: customer.state || 'Tamilnadu',
            state_code: customer.state_code || '33'
        }));
    };

    const addItem = () => {
        const amount = (parseFloat(newItem.qty) || 0) * (parseFloat(newItem.rate) || 0);
        if (newItem.sku || newItem.name) {
            setInvoice(prev => ({
                ...prev,
                items: [...prev.items, { ...newItem, amount }]
            }));
            // Reset form
            setNewItem({ sku: '', name: '', process: '', qty: 1, rate: 0 });
        }
    };

    const handlePartSelect = (part) => {
        setNewItem({
            sku: part.sku,
            name: part.name,
            process: part.process || '',
            qty: 1,
            rate: part.price || 0
        });
    };

    const updateItem = (index, field, value) => {
        const newItems = [...invoice.items];
        const item = { ...newItems[index], [field]: value };
        if (field === 'sku') {
            const product = inventory.find(p => p.sku === value);
            if (product) {
                item.name = product.name;
                item.process = product.process || '';
                item.rate = product.price;
            }
        }
        if (field === 'qty' || field === 'rate' || field === 'sku') {
            item.amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
        }
        newItems[index] = item;
        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index) => {
        setInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        try {
            await invoke('save_invoice', {
                invoice: {
                    id: invoice.id,
                    client_name: invoice.client_name,
                    vendor_code: invoice.vendor_code,
                    date: invoice.date,
                    due_date: invoice.due_date,
                    amount: totals.total,
                    status: invoice.status,
                    dc_no: invoice.dc_no,
                    dc_date: invoice.dc_date,
                    po_no: invoice.po_no,
                    po_date: invoice.po_date,
                    transport_mode: invoice.transport_mode,
                    invoice_type: invoice.invoice_type,
                    items_json: JSON.stringify(invoice.items),
                    hsn_code: invoice.hsn_code,
                    sac_code: invoice.sac_code,
                    state: invoice.state,
                    state_code: invoice.state_code
                }
            });
            showAlert('success', 'Invoice Saved', 'Invoice saved successfully.');
            setTimeout(() => navigate('/invoices'), 1500);
        } catch (e) {
            showAlert('error', 'Save Failed', String(e));
        }
    };

    const handlePrint = async () => {
        if (!invoiceRef.current) return;

        setPdfProgress({ isGenerating: true, progress: 0, status: 'Preparing invoice...' });

        try {
            // Step 1: Wait for images to load (10%)
            setPdfProgress({ isGenerating: true, progress: 10, status: 'Loading images...' });
            const images = invoiceRef.current.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            // Step 2: Capturing invoice (30%)
            setPdfProgress({ isGenerating: true, progress: 30, status: 'Capturing invoice...' });
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                imageTimeout: 0,
                onclone: (clonedDoc) => {
                    const noPrintEls = clonedDoc.querySelectorAll('.no-print');
                    noPrintEls.forEach(el => el.style.display = 'none');

                    const logoImgs = clonedDoc.querySelectorAll('.logo-img');
                    logoImgs.forEach(img => {
                        img.style.width = '80px';
                        img.style.height = 'auto';
                        img.style.maxHeight = '80px';
                        img.style.objectFit = 'contain';
                    });

                    const inputs = clonedDoc.querySelectorAll('.table-input, .form-input');
                    inputs.forEach(input => {
                        const value = input.value;
                        const span = clonedDoc.createElement('span');
                        span.textContent = value;
                        span.style.fontFamily = 'inherit';
                        span.style.fontSize = 'inherit';
                        span.style.width = '100%';
                        span.style.display = 'inline-block';

                        if (input.classList.contains('text-right')) {
                            span.style.textAlign = 'right';
                        }

                        if (input.parentNode) {
                            input.parentNode.replaceChild(span, input);
                        }
                    });
                }
            });

            // Step 3: Generating PDF (60%)
            setPdfProgress({ isGenerating: true, progress: 60, status: 'Generating PDF...' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // Step 4: Preparing file (80%)
            setPdfProgress({ isGenerating: true, progress: 80, status: 'Preparing file...' });
            const pdfData = pdf.output('arraybuffer');

            // Step 5: Saving (90%)
            setPdfProgress({ isGenerating: true, progress: 90, status: 'Choose save location...' });
            const filePath = await save({ filters: [{ name: 'PDF', extensions: ['pdf'] }], defaultPath: `${invoice.id}.pdf` });

            if (filePath) {
                setPdfProgress({ isGenerating: true, progress: 95, status: 'Saving to disk...' });
                await writeFile(filePath, new Uint8Array(pdfData));
                setPdfProgress({ isGenerating: false, progress: 100, status: '' });
                showAlert('success', 'PDF Saved', `Saved to ${filePath}`);
            } else {
                setPdfProgress({ isGenerating: false, progress: 0, status: '' });
            }
        } catch (e) {
            setPdfProgress({ isGenerating: false, progress: 0, status: '' });
            showAlert('error', 'PDF Error', String(e));
        }
    };

    return (
        <div className="page-container">
            <header className="page-header no-print">
                <div className="flex items-center gap-4">
                    <button className="btn-ghost" onClick={() => navigate('/invoices')}><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="page-title">{id ? 'Edit Invoice' : 'Create Invoice'}</h1>
                        <p className="page-subtitle">Invoice details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn-primary-glow" onClick={handleSave} style={{ background: '#10b981' }}><Save size={18} /> Save</button>
                    <button className="btn-primary-glow" onClick={handlePrint}><Printer size={18} /> PDF</button>
                </div>
            </header>

            {/* Editor Controls */}
            <div className="card mb-4 no-print p-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>Invoice No</label>
                        <input type="text" className="form-input" value={invoice.id}
                            onChange={e => setInvoice({ ...invoice, id: e.target.value })} placeholder="INV-001" />
                    </div>
                    <div className="form-group">
                        <label>Customer</label>
                        <div
                            onClick={() => setIsCustomerModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                color: invoice.client_name ? 'var(--text-primary)' : 'var(--text-secondary)',
                                minHeight: '38px'
                            }}
                        >
                            <Search size={14} />
                            <span>{invoice.client_name || 'Click to select customer...'}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Date (DD-MM-YYYY)</label>
                        <input type="text" className="form-input"
                            value={toDisplayDate(invoice.date)}
                            placeholder="DD-MM-YYYY"
                            onChange={e => {
                                const formatted = formatDateInput(e.target.value);
                                setInvoice({ ...invoice, date: formatted.length === 10 ? toISODate(formatted) : invoice.date });
                            }}
                            onBlur={e => {
                                const formatted = formatDateInput(e.target.value);
                                if (formatted.length === 10) {
                                    setInvoice({ ...invoice, date: toISODate(formatted) });
                                }
                            }} />
                    </div>
                    <div className="form-group">
                        <label>Vendor Code</label>
                        <input type="text" className="form-input" value={invoice.vendor_code}
                            onChange={e => setInvoice({ ...invoice, vendor_code: e.target.value })} placeholder="VC-001" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>State</label>
                        <input type="text" className="form-input" value={invoice.state}
                            onChange={e => setInvoice({ ...invoice, state: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>State Code</label>
                        <input type="text" className="form-input" value={invoice.state_code}
                            onChange={e => setInvoice({ ...invoice, state_code: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>DC No</label>
                        <input type="text" className="form-input" value={invoice.dc_no}
                            onChange={e => setInvoice({ ...invoice, dc_no: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>DC Date</label>
                        <input type="text" className="form-input"
                            value={invoice.dc_date}
                            placeholder="DD-MM-YYYY"
                            onChange={e => setInvoice({ ...invoice, dc_date: formatDateInput(e.target.value) })} />
                    </div>
                    <div className="form-group">
                        <label>PO No</label>
                        <input type="text" className="form-input" value={invoice.po_no}
                            onChange={e => setInvoice({ ...invoice, po_no: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>PO Date</label>
                        <input type="text" className="form-input"
                            value={invoice.po_date}
                            placeholder="DD-MM-YYYY"
                            onChange={e => setInvoice({ ...invoice, po_date: formatDateInput(e.target.value) })} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>Transport Mode</label>
                        <input type="text" className="form-input" value={invoice.transport_mode}
                            onChange={e => setInvoice({ ...invoice, transport_mode: e.target.value })} placeholder="By Road" />
                    </div>

                    <div className="form-group">

                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>SAC Code</label>
                        <input type="text" className="form-input" value={invoice.sac_code}
                            onChange={e => setInvoice({ ...invoice, sac_code: e.target.value })} placeholder="Enter SAC" />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                            <input type="checkbox" checked={invoice.invoice_type === 'Service'}
                                onChange={() => setInvoice({ ...invoice, invoice_type: invoice.invoice_type === 'Service' ? '' : 'Service' })} /> Service (SAC)
                        </label>
                    </div>
                    <div className="form-group">
                        <label>HSN Code</label>
                        <input type="text" className="form-input" value={invoice.hsn_code}
                            onChange={e => setInvoice({ ...invoice, hsn_code: e.target.value })} placeholder="Enter HSN" />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                            <input type="checkbox" checked={invoice.invoice_type === 'Sale'}
                                onChange={() => setInvoice({ ...invoice, invoice_type: invoice.invoice_type === 'Sale' ? '' : 'Sale' })} /> Sale (HSN)
                        </label>
                    </div>
                </div>

                {/* Inline Add Line Item Section */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Add Line Item</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 80px auto', gap: '0.75rem', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Part No. (SKU)</label>
                            <div
                                onClick={() => setIsPartModalOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    color: newItem.sku ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <Search size={14} />
                                <span>{newItem.sku || 'Click to select part...'}</span>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Part Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="Part name"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Process</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newItem.process}
                                onChange={(e) => setNewItem({ ...newItem, process: e.target.value })}
                                placeholder="Process"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Qty</label>
                            <input
                                type="number"
                                className="form-input"
                                value={newItem.qty}
                                onChange={(e) => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })}
                                placeholder="1"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Rate</label>
                            <input
                                type="number"
                                className="form-input"
                                value={newItem.rate}
                                onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                            />
                        </div>
                        <button
                            className="btn-primary-glow"
                            style={{ height: '38px', padding: '0 1rem' }}
                            onClick={addItem}
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>
                </div>

                {/* Added Line Items Section */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        Added Line Items ({invoice.items.length})
                    </h4>
                    {invoice.items.length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <p style={{ margin: 0 }}>No items added yet. Use the form above to add line items.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.85rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden'
                            }}>
                                <thead>
                                    <tr style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>#</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Part No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Part Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Process</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Qty</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Rate</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Amount</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{i + 1}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>{item.sku || '-'}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.name || '-'}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.process || '-'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>{item.qty}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>₹{item.rate}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>₹{(item.amount || 0).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => removeItem(i)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '0.4rem',
                                                        cursor: 'pointer',
                                                        color: 'var(--danger)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={`Delete ${item.name || 'Item'}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div >

            {/* Print Layout */}
            <div className="print-container-wrapper">
                <div className="invoice-paper" ref={invoiceRef}>
                    <div className="inv-header">
                        <div className="logo-section"><img src={lfiLogo} alt="LFI Logo" className="logo-img" /></div>
                        <div className="company-details">
                            <h1>LITTLE FLOWER INDUSTRIES</h1>
                            <p>ISO 9001-2015 COMPANY</p>
                            <p>#45/A, Thiruvalluvar Street, TMP Nagar, Padi, Chennai- 600 050</p>
                            <p>Email: lfijustus71@gmail.com</p>
                        </div>
                        <div className="gst-section">
                            <p>GSTIN: 33AHPPG8152P1ZR</p>
                            <p>Cell: 9444104884</p>
                        </div>
                    </div>

                    <div className="inv-divider"></div>

                    <div className="inv-meta-grid">
                        <div className="bill-to ml-2">
                            <h3>Details of Receiver / Billed to:</h3>
                            <p><strong>Name:</strong> {invoice.client_details?.name || '_________________'}</p>
                            <p><strong>Address:</strong> {invoice.client_details?.address || '_________________'}</p>
                            <div className="flex justify-between mt-2">
                                <p><strong>GSTIN:</strong> {invoice.client_details?.gstin || '________'}</p>
                                <p><strong>State:</strong> {invoice.client_details?.state || '__________'} ({invoice.client_details?.state_code || '__'})</p>
                            </div>
                        </div>
                        <div className="inv-details">
                            <div className="row"><span>Invoice No:</span> <span>{invoice.id}</span></div>
                            <div className="row"><span>Date:</span> <span>{invoice.date}</span></div>
                            <div className="row"><span>P.O. No:</span> <span>{invoice.po_no || '-'}</span></div>
                            <div className="row"><span>P.O. Date:</span> <span>{invoice.po_date || '-'}</span></div>
                            <div className="row"><span>Transport:</span> <span>{invoice.transport_mode || '-'}</span></div>
                            <div className="row"><span>Vendor Code:</span> <span>{invoice.vendor_code || '-'}</span></div>
                            <div className="row"><span>State, Code:</span> <span>{invoice.state || '-'}, {invoice.state_code || '-'}</span></div>
                        </div>
                    </div>

                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                                <th style={{ width: '150px', textAlign: 'center' }}>Part Name</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Part No.</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Process</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Rate</th>
                                <th style={{ textAlign: 'center' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                    <td style={{ textAlign: 'center' }}>{item.name || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.sku || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.process || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                    <td style={{ textAlign: 'center' }}>₹{item.rate}</td>
                                    <td style={{ textAlign: 'center' }}>₹{(item.amount || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            {Array.from({ length: Math.max(0, 15 - invoice.items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="empty-row"><td colSpan={7}>&nbsp;</td></tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="inv-footer-section">
                        <div className="left-section">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><strong>SAC CODE :</strong> {invoice.sac_code || '...........'}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>(Service)</span>
                                        <div style={{ width: '15px', height: '15px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {invoice.invoice_type === 'Service' && '✓'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><strong>HSN CODE :</strong> {invoice.hsn_code || '...........'}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>(Sale)</span>
                                        <div style={{ width: '15px', height: '15px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {invoice.invoice_type === 'Sale' && '✓'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="amount-words" style={{ marginTop: '10px' }}>
                                <p><strong>Total Invoice Amount in Words:</strong></p>
                                <p style={{ textTransform: 'capitalize' }}>Rupees {toWords(Math.round(totals.total))} Only</p>
                                <p style={{ fontStyle: 'italic', fontWeight: 'bold', marginTop: '10px' }}>Received the goods in good condition</p>
                            </div>
                        </div>
                        <div className="totals-section">
                            <div className="row"><span>Total Before Tax</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                            <div className="row"><span>CGST (9%)</span><span>₹{totals.cgst.toFixed(2)}</span></div>
                            <div className="row"><span>SGST (9%)</span><span>₹{totals.sgst.toFixed(2)}</span></div>
                            <div className="row grand-total"><span>Total Amount</span><span>₹{totals.total.toFixed(2)}</span></div>
                        </div>
                    </div>

                    <div className="signature-section">
                        <div className="sign-box" style={{ marginLeft: 'auto', marginRight: '50px' }}>
                            <p>For LITTLE FLOWER INDUSTRIES</p>
                            <br /><br />
                            <p>Authorised Signature</p>
                        </div>
                    </div>
                </div>


                <style>{`
                .invoice-paper { background: white; color: black; width: 210mm; min-height: 297mm; padding: 10mm; margin: 0 auto; border: 1px solid #ddd; font-family: 'Times New Roman', serif; position: relative; }
                .inv-header { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 5px; position: relative; }
                .logo-section { position: absolute; left: 0; top: 0; }
                .logo-img { width: 80px; height: auto; max-height: 80px; object-fit: contain; }
                .company-details h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; color: black; }
                .company-details p { margin: 2px 0; font-size: 12px; }
                .gst-section { position: absolute; right: 0; top: 0; text-align: right; font-size: 12px; font-weight: bold; }
                .inv-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid black; margin-bottom: 0; }
                .bill-to { padding: 5px; border-right: 1px solid black; font-size: 13px; }
                .inv-details { font-size: 13px; }
                .inv-details .row { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px 5px; }
                .inv-details .row:last-child { border-bottom: none; }
                .inv-table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
                .inv-table th { border: 1px solid black; padding: 5px; background: #f0f0f0; }
                .inv-table td { border: 1px solid black; padding: 4px 5px; vertical-align: middle; word-wrap: break-word; }
                .table-input { border: none; width: 100%; background: transparent; font-family: inherit; padding: 0 0 2px 0; height: auto; }
                .empty-row td { height: 24px; }
                .inv-footer-section { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid black; border-top: none; }
                .left-section { padding: 5px; font-size: 12px; border-right: 1px solid black; }
                .totals-section { font-size: 12px; }
                .totals-section .row { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px 5px; }
                .totals-section .row:last-child { border-bottom: none; }
                .signature-section { display: flex; justify-content: space-between; padding: 20px 5px; border: 1px solid black; border-top: none; font-size: 12px; align-items: flex-end; }
                .sign-box { text-align: center; }
                @media print { .no-print { display: none; } .page-container { padding: 0; margin: 0; background: white; } .invoice-paper { border: none; margin: 0; } }
            `}</style>

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                />

                <PartSelectorModal
                    isOpen={isPartModalOpen}
                    onClose={() => setIsPartModalOpen(false)}
                    inventory={inventory}
                    onSelect={handlePartSelect}
                />

                <CustomerSelectorModal
                    isOpen={isCustomerModalOpen}
                    onClose={() => setIsCustomerModalOpen(false)}
                    customers={customers}
                    onSelect={handleCustomerSelect}
                />

                {/* PDF Progress Modal */}
                {pdfProgress.isGenerating && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '2rem',
                                minWidth: '320px',
                                textAlign: 'center',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div style={{ marginBottom: '1rem' }}>
                                <Printer size={40} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Generating PDF</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {pdfProgress.status}
                                </p>
                            </div>

                            <div style={{
                                background: 'var(--bg-tertiary)',
                                borderRadius: '10px',
                                height: '12px',
                                overflow: 'hidden',
                                marginBottom: '0.75rem'
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pdfProgress.progress}%` }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                                        borderRadius: '10px'
                                    }}
                                />
                            </div>

                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary)', fontSize: '1.1rem' }}>
                                {pdfProgress.progress}%
                            </p>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateInvoice;
