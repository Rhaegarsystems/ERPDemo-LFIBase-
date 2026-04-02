import React from 'react';
import lfiLogo from '../assets/Logo.png';

const InvoiceTemplate = React.forwardRef(({ invoice, totals, taxRates, amountToWords }, ref) => {
    if (!invoice) return null;

    return (
        <div className="print-container-wrapper" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div className="invoice-paper" ref={ref}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '2px' }}>INVOICE</h2>
                </div>
                <div className="inv-header">
                    <div className="logo-section"><img src={lfiLogo} alt="LFI Logo" className="logo-img" /></div>
                    <div className="company-details">
                        <h1>LITTLE FLOWER INDUSTRIES</h1>
                        <p>ISO 9001-2015 COMPANY</p>
                        <p>No:209, new tiny sector, ambattur industrial estate, chennai-600058</p>
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
                        <p><strong>Name:</strong> {invoice.client_details?.name || invoice.client_name || '_________________'}</p>
                        <p><strong>Address:</strong> {invoice.client_details?.address || '_________________'}</p>
                        <div className="flex justify-between mt-2">
                            <p><strong>GSTIN:</strong> {invoice.client_details?.gstin || '________'}</p>
                            <p style={{ paddingRight: '20px' }}><strong>Pincode:</strong> {invoice.pincode || '______'}</p>
                        </div>
                        <p><strong>State:</strong> {invoice.state || '__________'} ({invoice.state_code || '__'})</p>
                    </div>
                    <div className="inv-details">
                        <div className="row"><span>Invoice No:</span> <span>{invoice.id}</span></div>
                        <div className="row"><span>Our Invoice Date:</span> <span>{invoice.date}</span></div>
                        <div className="row"><span>Your DC No:</span> <span>{invoice.dc_no || '-'}</span></div>
                        <div className="row"><span>Your DC Date:</span> <span>{invoice.dc_date || '-'}</span></div>
                        <div className="row"><span>P.O No:</span> <span>{invoice.po_no || '-'}</span></div>
                        <div className="row"><span>P.O Date:</span> <span>{invoice.po_date || '-'}</span></div>
                        <div className="row"><span>Vendor Code:</span> <span>{invoice.vendor_code || '-'}</span></div>
                        <div className="row"><span>Transport:</span> <span>{invoice.transport_mode || '-'}</span></div>
                        <div className="row"><span>SAC Code:</span> <span>{invoice.sac_code || '-'}</span></div>
                        <div className="row"><span>HSN Code:</span> <span>{invoice.hsn_code || '-'}</span></div>
                        <div className="row">
                            <span>(Service)</span>
                            <span style={{ width: '11px', height: '11px', border: '1px solid black', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {invoice.invoice_type && invoice.invoice_type.includes('Service') && '✓'}
                            </span>
                        </div>
                        <div className="row">
                            <span>(Sale)</span>
                            <span style={{ width: '11px', height: '11px', border: '1px solid black', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {invoice.invoice_type && invoice.invoice_type.includes('Sale') && '✓'}
                            </span>
                        </div>
                    </div>
                </div>

                <table className="inv-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Part Name</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Part Number</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Process</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Rate</th>
                            <th style={{ textAlign: 'center' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items && invoice.items.map((item, i) => (
                            <tr key={i}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td style={{ textAlign: 'center' }}>{item.name || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{item.part_number || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{item.process || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ textAlign: 'center' }}>₹{item.rate}</td>
                                <td style={{ textAlign: 'center' }}>₹{(item.amount || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 15 - (invoice.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="empty-row">
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="inv-footer-section">
                    <div className="left-section">
                        <div className="amount-words" style={{ marginTop: '10px' }}>
                            <p><strong>Total Invoice Amount in Words:</strong></p>
                            <p style={{ textTransform: 'capitalize' }}>{amountToWords(totals.total)}</p>
                            <p style={{ fontStyle: 'italic', fontWeight: 'bold', marginTop: '10px', fontSize: '1.2rem' }}>Received the goods in good condition</p>
                        </div>
                    </div>
                    <div className="totals-section">
                        <div className="row"><span>Total Before Tax</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                        <div className="row">
                            <span>CGST ({taxRates.cgst}%)</span>
                            <span>₹{totals.cgst.toFixed(2)}</span>
                        </div>
                        <div className="row">
                            <span>SGST ({taxRates.sgst}%)</span>
                            <span>₹{totals.sgst.toFixed(2)}</span>
                        </div>
                        <div className="row grand-total"><span>Total Amount</span><span>₹{totals.total.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="signature-section">
                    <div className="sign-box" style={{ marginLeft: 'auto', marginRight: '50px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '14px' }}>For LITTLE FLOWER INDUSTRIES</p>
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
                .company-details h1 { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; color: black; }
                .company-details p { margin: 2px 0; font-size: 13px; }
                .gst-section { position: absolute; right: 0; top: 0; text-align: right; font-size: 13px; font-weight: bold; }
                .inv-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid black; margin-bottom: 0; }
                .bill-to { padding: 5px; border-right: 1px solid black; font-size: 14px; }
                .inv-details { font-size: 14px; }
                .inv-details .row { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px 5px; }
                .inv-details .row:last-child { border-bottom: none; }
                .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; border: 1px solid black; }
                .inv-table th { border: 1px solid black; padding: 5px; background: #f0f0f0; }
                .inv-table td { border: 1px solid black; border-top: none; border-bottom: none; padding: 4px 5px; vertical-align: middle; word-wrap: break-word; }
                .inv-table tr { border-bottom: 1px solid black; }
                .inv-table tr:last-child { border-bottom: none; }
                .empty-row td { height: 24px; }
                .inv-footer-section { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid black; border-top: none; }
                .left-section { padding: 5px; font-size: 13px; border-right: 1px solid black; }
                .totals-section { font-size: 13px; }
                .totals-section .row { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px 5px; }
                .totals-section .row:last-child { border-bottom: none; }
                .signature-section { display: flex; justify-content: space-between; padding: 20px 5px; border: 1px solid black; border-top: none; font-size: 13px; align-items: flex-end; }
                .sign-box { text-align: center; }
            `}</style>
        </div>
    );
});

export default InvoiceTemplate;
