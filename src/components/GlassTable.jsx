import React from 'react';
import '../styles/GlassTable.css';
import { Edit2, Trash2, Printer } from 'lucide-react';

const GlassTable = ({ columns, data, actions, onRowClick }) => {
    return (
        <div className="glass-table-container">
            <table className="glass-table">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index}>{col.header}</th>
                        ))}
                        {actions && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            onClick={() => onRowClick && onRowClick(row)}
                            className={onRowClick ? 'clickable-row' : ''}
                        >
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                                </td>
                            ))}
                            {actions && (
                                <td>
                                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                                        {actions.onPrint && (
                                            <button className="icon-btn print" onClick={() => actions.onPrint(row)} title="Print/Save PDF">
                                                <Printer size={16} />
                                            </button>
                                        )}
                                        <button className="icon-btn edit" onClick={() => actions.onEdit && actions.onEdit(row)}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="icon-btn delete" onClick={() => actions.onDelete && actions.onDelete(row)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GlassTable;
