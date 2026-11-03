import React from 'react';
import { BookOpen, Printer, Layers } from 'lucide-react';
import { useDivisionStore, DIVISIONS, DIVISION_META } from '../../store/divisionStore';

export default function DivisionSwitcher({ showAllOption = false, className = '' }) {
    const { activeDivision, setActiveDivision } = useDivisionStore();

    return (
        <div className={`inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 shadow-inner ${className}`}>
            <button
                type="button"
                onClick={() => setActiveDivision(DIVISIONS.BOOK_SHOP)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeDivision === DIVISIONS.BOOK_SHOP
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
            >
                <BookOpen size={14} />
                <span>Pothmela Book Shop</span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDivision(DIVISIONS.PRINT_SHOP)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeDivision === DIVISIONS.PRINT_SHOP
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
            >
                <Printer size={14} />
                <span>Ink Printing Hub</span>
            </button>

            {showAllOption && (
                <button
                    type="button"
                    onClick={() => setActiveDivision(DIVISIONS.ALL)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeDivision === DIVISIONS.ALL
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                >
                    <Layers size={14} />
                    <span>All Divisions</span>
                </button>
            )}
        </div>
    );
}
