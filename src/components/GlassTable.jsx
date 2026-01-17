import React from 'react';
import { motion } from 'framer-motion';
import '../styles/GlassTable.css';
import { Edit2, Trash2 } from 'lucide-react';

const GlassTable = ({ columns, data, actions }) => {
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
                        <motion.tr
                            key={rowIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: rowIndex * 0.05 }}
                        >
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                                </td>
                            ))}
                            {actions && (
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="icon-btn delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GlassTable;
