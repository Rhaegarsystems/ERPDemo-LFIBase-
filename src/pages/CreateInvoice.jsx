import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Printer, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toWords } from 'number-to-words';
import AlertModal from '../components/AlertModal';
import '../styles/PageCommon.css';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const invoiceRef = useRef(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });

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
        invoice_type: 'Sale', // 'Sale' or 'Service'
        hsn_code: '',
        sac_code: '',
        state: 'Tamilnadu',
        state_code: '33',
        status: 'Pending',
        items: []
    });

    const [totals, setTotals] = useState({ subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

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

    const handleCustomerChange = (e) => {
        const custName = e.target.value;
        const cust = customers.find(c => c.name === custName);
        setInvoice(prev => ({
            ...prev,
            client_name: custName,
            client_details: cust || null,
            vendor_code: cust?.vendor_code || '',
            state: cust?.state || 'Tamilnadu',
            state_code: cust?.state_code || '33'
        }));
    };

    const addItem = () => {
        setInvoice(prev => ({
            ...prev,
            items: [...prev.items, { sku: '', name: '', process: '', qty: 1, rate: 0, amount: 0 }]
        }));
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
                    items_json: JSON.stringify(invoice.items)
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
        try {
            const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfData = pdf.output('arraybuffer');
            const filePath = await save({ filters: [{ name: 'PDF', extensions: ['pdf'] }], defaultPath: `${invoice.id}.pdf` });
            if (filePath) {
                await writeFile(filePath, new Uint8Array(pdfData));
                showAlert('success', 'PDF Saved', `Saved to ${filePath}`);
            }
        } catch (e) {
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
                        <select className="form-input" value={invoice.client_name} onChange={handleCustomerChange}>
                            <option value="">-- Select --</option>
                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Date</label>
                        <input type="date" className="form-input" value={invoice.date}
                            onChange={e => setInvoice({ ...invoice, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Vendor Code</label>
                        <input type="text" className="form-input" value={invoice.vendor_code}
                            onChange={e => setInvoice({ ...invoice, vendor_code: e.target.value })} placeholder="VC-001" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>DC No</label>
                        <input type="text" className="form-input" value={invoice.dc_no}
                            onChange={e => setInvoice({ ...invoice, dc_no: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>DC Date</label>
                        <input type="date" className="form-input" value={invoice.dc_date}
                            onChange={e => setInvoice({ ...invoice, dc_date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>PO No</label>
                        <input type="text" className="form-input" value={invoice.po_no}
                            onChange={e => setInvoice({ ...invoice, po_no: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>PO Date</label>
                        <input type="date" className="form-input" value={invoice.po_date}
                            onChange={e => setInvoice({ ...invoice, po_date: e.target.value })} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>Transport Mode</label>
                        <input type="text" className="form-input" value={invoice.transport_mode}
                            onChange={e => setInvoice({ ...invoice, transport_mode: e.target.value })} placeholder="By Road" />
                    </div>
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
                        <label>Invoice Type</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={invoice.invoice_type === 'Sale'}
                                    onChange={() => setInvoice({ ...invoice, invoice_type: 'Sale' })} /> Sale (HSN)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={invoice.invoice_type === 'Service'}
                                    onChange={() => setInvoice({ ...invoice, invoice_type: 'Service' })} /> Service (SAC)
                            </label>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label>HSN Code</label>
                        <input type="text" className="form-input" value={invoice.hsn_code}
                            onChange={e => setInvoice({ ...invoice, hsn_code: e.target.value })} placeholder="Enter HSN" />
                    </div>
                    <div className="form-group">
                        <label>SAC Code</label>
                        <input type="text" className="form-input" value={invoice.sac_code}
                            onChange={e => setInvoice({ ...invoice, sac_code: e.target.value })} placeholder="Enter SAC" />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button className="btn-primary-glow flex items-center gap-2" onClick={addItem}><Plus size={16} /> Add Line Item</button>
                </div>
            </div>

            {/* Print Layout */}
            <div className="print-container-wrapper">
                <div className="invoice-paper" ref={invoiceRef}>
                    <div className="inv-header">
                        <div className="logo-section"><div className="logo-box">LFI</div></div>
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
                                <p><strong>State:</strong> {invoice.state} ({invoice.state_code})</p>
                            </div>
                        </div>
                        <div className="inv-details">
                            <div className="row"><span>Invoice No:</span> <span>{invoice.id}</span></div>
                            <div className="row"><span>Date:</span> <span>{invoice.date}</span></div>
                            <div className="row"><span>P.O. No:</span> <span>{invoice.po_no || '-'}</span></div>
                            <div className="row"><span>P.O. Date:</span> <span>{invoice.po_date || '-'}</span></div>
                            <div className="row"><span>Transport:</span> <span>{invoice.transport_mode || '-'}</span></div>
                            <div className="row"><span>Vendor Code:</span> <span>{invoice.vendor_code || '-'}</span></div>
                        </div>
                    </div>

                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>S.No</th>
                                <th style={{ width: '150px' }}>Part Name</th>
                                <th style={{ width: '100px' }}>Part No.</th>
                                <th style={{ width: '100px' }}>Process</th>
                                <th style={{ width: '60px' }}>Qty</th>
                                <th style={{ width: '80px' }}>Rate</th>
                                <th>Amount</th>
                                <th className="no-print" style={{ width: '30px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td><input className="table-input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></td>
                                    <td>
                                        <input className="table-input" list="sku-list" value={item.sku} onChange={e => updateItem(i, 'sku', e.target.value)} />
                                        <datalist id="sku-list">{inventory.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}</datalist>
                                    </td>
                                    <td><input className="table-input" value={item.process} onChange={e => updateItem(i, 'process', e.target.value)} /></td>
                                    <td><input className="table-input text-right" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></td>
                                    <td>₹{item.rate}</td>
                                    <td className="text-right">₹{item.amount.toFixed(2)}</td>
                                    <td className="no-print text-center">
                                        <button onClick={() => removeItem(i)} className="text-danger hover:bg-danger/10 p-1 rounded"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                            {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="empty-row"><td colSpan={8}>&nbsp;</td></tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="inv-footer-section">
                        <div className="left-section">
                            {invoice.invoice_type === 'Service' ? (
                                <p><strong>SAC CODE:</strong> {invoice.sac_code || '...........'}</p>
                            ) : (
                                <p><strong>HSN CODE:</strong> {invoice.hsn_code || '...........'}</p>
                            )}
                            <div className="amount-words">
                                <p><strong>Total Invoice Amount in Words:</strong></p>
                                <p style={{ textTransform: 'capitalize' }}>Rupees {toWords(Math.round(totals.total))} Only</p>
                            </div>
                        </div>
                        <div className="totals-section">
                            <div className="row"><span>Total Before Tax</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                            <div className="row"><span>CGST (9%)</span><span>₹{totals.cgst.toFixed(2)}</span></div>
                            <div className="row"><span>SGST (9%)</span><span>₹{totals.sgst.toFixed(2)}</span></div>
                            <div className="row grand-total"><span>Total After Tax</span><span>₹{totals.total.toFixed(2)}</span></div>
                        </div>
                    </div>

                    <div className="signature-section">
                        <p>Received the goods in good condition</p>
                        <div className="sign-box">
                            <p>For LITTLE FLOWER INDUSTRIES</p>
                            <br /><br />
                            <p>Authorised Signature</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .invoice-paper { background: white; color: black; width: 210mm; min-height: 297mm; padding: 10mm; margin: 0 auto; border: 1px solid #ddd; font-family: 'Times New Roman', serif; position: relative; }
                .inv-header { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 5px; position: relative; }
                .logo-box { border: 2px solid #8b5cf6; color: #8b5cf6; padding: 5px; font-weight: bold; font-size: 24px; position: absolute; left: 0; top: 0; }
                .company-details h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; color: black; }
                .company-details p { margin: 2px 0; font-size: 12px; }
                .gst-section { position: absolute; right: 0; top: 0; text-align: right; font-size: 12px; font-weight: bold; }
                .inv-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid black; margin-bottom: 0; }
                .bill-to { padding: 5px; border-right: 1px solid black; font-size: 13px; }
                .inv-details { font-size: 13px; }
                .inv-details .row { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px 5px; }
                .inv-details .row:last-child { border-bottom: none; }
                .inv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .inv-table th { border: 1px solid black; padding: 5px; background: #f0f0f0; }
                .inv-table td { border: 1px solid black; padding: 5px; }
                .table-input { border: none; width: 100%; background: transparent; font-family: inherit; }
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
        </div>
    );
};

export default CreateInvoice;
