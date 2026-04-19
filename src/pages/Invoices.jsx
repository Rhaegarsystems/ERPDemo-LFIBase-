import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Plus, Search, FileText, Printer, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GlassTable from '../components/GlassTable';
import InvoiceStatusModal from '../components/InvoiceStatusModal';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { useToast } from '../components/ToastProvider';
import { useConfirmToast } from '../components/ConfirmToastProvider';
import { useTheme } from '../context/ThemeContext';
import '../styles/PageCommon.css';

const Invoices = () => {
    const navigate = useNavigate();
    const { autoOpenPdf } = useTheme();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(null);
    const toast = useToast();
    const confirmToast = useConfirmToast();
    const templateRef = useRef(null);

    const fetchInvoices = async () => {
        try {
            const result = await invoke('get_invoices');
            setData(result);
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredData(data);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredData(data.filter(item => 
                (item.id && item.id.toLowerCase().includes(term)) ||
                (item.client_name && item.client_name.toLowerCase().includes(term)) ||
                (item.vendor_code && item.vendor_code.toLowerCase().includes(term)) ||
                (item.date && item.date.toLowerCase().includes(term))
            ));
        }
    }, [searchTerm, data]);

    const columns = [
        { header: "Invoice No", accessor: "id" },
        { header: "Client", accessor: "client_name" },
        { header: "Vendor Code", accessor: "vendor_code" },
        { header: "Date", accessor: "date" },
        { header: "Amount", accessor: "amount", render: (val) => `₹${val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}` },
        {
            header: "Status", accessor: "status", render: (status) => (
                <span className={`badge ${status ? status.toLowerCase() : 'pending'}`}>
                    {status || 'Pending'}
                </span>
            )
        },
    ];

    const handleDelete = async (item) => {
        const confirmed = await confirmToast.showConfirm({
            title: 'Delete Invoice',
            message: `Are you sure you want to delete invoice "${item.id}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
        
        if (confirmed) {
            try {
                await invoke('delete_invoice', { id: item.id });
                fetchInvoices();
                toast.success('Deleted', 'Invoice deleted.');
            } catch (e) {
                toast.error('Error', "Delete failed: " + e);
            }
        }
    };

    const handleEdit = (item) => {
        navigate(`/invoices/edit/${item.id}`);
    };

    const handlePrint = async (item) => {
        setGeneratingPdf(item.id);
        try {
            const invoiceData = await invoke('get_invoice_with_customer', { id: item.id });
            const invoice = invoiceData.invoice;
            const customer = invoiceData.customer;

            let items = [];
            try {
                items = JSON.parse(invoice.items_json);
            } catch (e) {
                items = [];
            }

            const subtotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
            const isLocal = invoice.state_code === '33';
            const taxRates = { cgst: 9, sgst: 9 };
            const totals = {
                subtotal,
                cgst: isLocal ? subtotal * (taxRates.cgst / 100) : 0,
                sgst: isLocal ? subtotal * (taxRates.sgst / 100) : 0,
                igst: isLocal ? 0 : subtotal * 0.18,
                total: subtotal + (isLocal ? subtotal * 0.18 : subtotal * 0.18)
            };

            const formatDate = (dateStr) => {
                if (!dateStr || dateStr.length < 10) return dateStr || '';
                const parts = dateStr.split('-');
                return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
            };

            const invoiceWithExtras = {
                ...invoice,
                client_details: customer,
                date: formatDate(invoice.date),
                items: items.map(item => ({ ...item, qty: item.qty || 0, rate: item.rate || 0 }))
            };

            const { toWords } = await import('number-to-words');
            const amountToWords = (amount) => {
                try {
                    const rupees = Math.floor(amount);
                    const paise = Math.round((amount - rupees) * 100);
                    let result = `Rupees ${toWords(rupees)}`;
                    if (paise > 0) {
                        result += ` and ${toWords(paise)} Paise`;
                    }
                    return result + " Only";
                } catch (e) {
                    return "Zero Only";
                }
            };

            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '-9999px';
            wrapper.style.width = '800px';
            document.body.appendChild(wrapper);

            const root = ReactDOM.createRoot(wrapper);
            
            await new Promise((resolve) => {
                root.render(
                    <InvoiceTemplate 
                        ref={templateRef}
                        invoice={invoiceWithExtras} 
                        totals={totals} 
                        taxRates={taxRates} 
                        amountToWords={amountToWords} 
                    />
                );
                setTimeout(resolve, 100);
            });

            await new Promise(r => setTimeout(r, 500));

            const invoiceElement = wrapper.querySelector('.invoice-paper');
            if (!invoiceElement) {
                throw new Error('Invoice template not found');
            }

            const canvas = await html2canvas(invoiceElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            root.unmount();
            document.body.removeChild(wrapper);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const pdfData = pdf.output('arraybuffer');
            const filePath = await save({
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: `${invoice.id}.pdf`
            });

            if (filePath) {
                await writeFile(filePath, new Uint8Array(pdfData));
                
                toast.success('PDF Saved', `Saved to ${filePath}`, {
                    action: {
                        label: 'Open PDF',
                        onClick: async () => {
                            try {
                                await invoke('open_file', { path: filePath });
                            } catch (e) {
                                toast.error('Error', 'Could not open PDF file.');
                            }
                        }
                    }
                });
                
                // Stable Auto-Open using backend command (only if enabled)
                if (autoOpenPdf) {
                    try {
                        await invoke('open_file', { path: filePath });
                    } catch (e) {
                        console.error("Failed to auto-open PDF:", e);
                    }
                }
            } else {
                toast.warning('PDF Not Saved', 'Operation cancelled.');
            }
        } catch (e) {
            toast.error('PDF Error', String(e));
        } finally {
            setGeneratingPdf(null);
        }
    };

    const handleRowClick = (item) => {
        setSelectedInvoice(item);
        setIsStatusModalOpen(true);
    };

    const handleStatusChange = async (invoiceId, newStatus) => {
        try {
            await invoke('update_invoice_status', { id: invoiceId, status: newStatus });
            fetchInvoices();
            toast.success('Updated', `Invoice status changed to ${newStatus}.`);
        } catch (e) {
            toast.error('Error', "Status update failed: " + e);
            throw e;
        }
    };

    return (
        <div className="page-container">
            <header className="dashboard-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
                <div style={{ marginTop: 0 }}>
                    <h1 className="greeting-text" style={{ marginTop: 0 }}>Invoices</h1>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Billing and payments</p>
                </div>
                <button className="btn-primary-glow" onClick={() => navigate('/invoices/create')}>
                    <Plus size={18} /> New Invoice
                </button>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search invoices..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div className="empty-state">
                    <FileText size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>{searchTerm ? 'No Invoices Found' : 'No Invoices Found'}</h3>
                    <p>{searchTerm ? 'No invoices match your search.' : 'Create your first invoice to get started.'}</p>
                </div>
            ) : (
                <GlassTable
                    columns={columns}
                    data={filteredData}
                    actions={{ onEdit: handleEdit, onDelete: handleDelete, onPrint: handlePrint }}
                    onRowClick={handleRowClick}
                    loading={generatingPdf}
                />
            )}

            <InvoiceStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                invoice={selectedInvoice}
                onStatusChange={handleStatusChange}
            />

            {generatingPdf && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.98) 0%, rgba(139, 92, 246, 0.15) 100%)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    minWidth: '280px',
                    zIndex: 9999,
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <Printer size={20} style={{ color: '#8b5cf6' }} />
                    <span style={{ color: '#fff', fontWeight: 600 }}>Generating PDF for {generatingPdf}...</span>
                </div>
            )}
        </div>
    );
};

export default Invoices;
