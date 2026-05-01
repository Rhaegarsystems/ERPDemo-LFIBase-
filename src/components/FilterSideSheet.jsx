import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ArrowLeftRight } from 'lucide-react';
import '../styles/FilterSheet.css';

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

const FilterSideSheet = ({ isOpen, onClose, onApply, onClear, filters, processes }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.classList.add('modal-open');
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.classList.remove('modal-open');
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div className="filter-sheet-overlay" onClick={onClose} />
            <div className="filter-side-sheet">
                <div className="sheet-header">
                    <h3>Filter</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="sheet-body">
                    <div className="filter-section">
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Process</label>
                        <div className="custom-dropdown">
                            <button 
                                type="button"
                                className="dropdown-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span style={{ color: filters.process ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {filters.process || 'All Processes'}
                                </span>
                                <ChevronDown size={18} style={{ 
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }} />
                            </button>
                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() => {
                                            onApply({ ...filters, process: '' });
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        All Processes
                                    </button>
                                    {processes.map(proc => (
                                        <button
                                            key={proc}
                                            type="button"
                                            className="dropdown-item"
                                            onClick={() => {
                                                onApply({ ...filters, process: proc });
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            {proc}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="filter-section">
                        <label>Unit Price Range (₹)</label>
                        <div className="filter-column">
                            <input
                                type="number"
                                className="filter-input"
                                placeholder="Min"
                                value={filters.priceMin || ''}
                                onChange={(e) => onApply({ ...filters, priceMin: e.target.value })}
                            />
                            <ArrowLeftRight size={16} className="filter-arrow" />
                            <input
                                type="number"
                                className="filter-input"
                                placeholder="Max"
                                value={filters.priceMax || ''}
                                onChange={(e) => onApply({ ...filters, priceMax: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="filter-section">
                        <label>Created Date</label>
                        <div className="filter-column">
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="DD-MM-YYYY"
                                value={filters.createdFrom || ''}
                                onChange={(e) => onApply({ ...filters, createdFrom: formatDateInput(e.target.value) })}
                            />
                            <ArrowLeftRight size={16} className="filter-arrow" />
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="DD-MM-YYYY"
                                value={filters.createdTo || ''}
                                onChange={(e) => onApply({ ...filters, createdTo: formatDateInput(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="filter-section">
                        <label>Modified Date</label>
                        <div className="filter-column">
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="DD-MM-YYYY"
                                value={filters.modifiedFrom || ''}
                                onChange={(e) => onApply({ ...filters, modifiedFrom: formatDateInput(e.target.value) })}
                            />
                            <ArrowLeftRight size={16} className="filter-arrow" />
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="DD-MM-YYYY"
                                value={filters.modifiedTo || ''}
                                onChange={(e) => onApply({ ...filters, modifiedTo: formatDateInput(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
                <div className="sheet-footer">
                    <button className="btn-ghost" onClick={onClear}>Clear All</button>
                    <button className="btn-primary-glow" onClick={() => { onApply(filters); onClose(); }}>Apply Filters</button>
                </div>
            </div>
        </>
    );
};

export default FilterSideSheet;