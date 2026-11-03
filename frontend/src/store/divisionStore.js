import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DIVISIONS = {
    BOOK_SHOP: 'book_shop',
    PRINT_SHOP: 'print_shop',
    ALL: 'all',
};

export const DIVISION_META = {
    book_shop: {
        id: 'book_shop',
        label: 'Pothmela Book Shop',
        shortLabel: 'Book Shop',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        activePill: 'bg-emerald-600 text-white shadow-sm',
        icon: 'book',
        tagline: 'Your Trusted Bookstore & Stationery Hub',
    },
    print_shop: {
        id: 'print_shop',
        label: 'Ink Printing Hub (pvt) Ltd',
        shortLabel: 'Print Shop',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        activePill: 'bg-blue-600 text-white shadow-sm',
        icon: 'printer',
        tagline: 'Premium Quality Printing & Branding Solutions',
    },
    all: {
        id: 'all',
        label: 'All Divisions (Consolidated)',
        shortLabel: 'All Divisions',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        activePill: 'bg-purple-600 text-white shadow-sm',
        icon: 'grid',
        tagline: 'Combined enterprise view',
    }
};

export const useDivisionStore = create(
    persist(
        (set, get) => ({
            activeDivision: 'book_shop', // Default to book_shop or user preference
            setActiveDivision: (division) => set({ activeDivision: division }),
            getDivisionMeta: () => DIVISION_META[get().activeDivision] || DIVISION_META.book_shop,
        }),
        {
            name: 'ink-hub-active-division',
        }
    )
);
