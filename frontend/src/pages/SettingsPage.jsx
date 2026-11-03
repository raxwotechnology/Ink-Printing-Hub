import React, { useEffect, useState, useRef } from 'react';
import { Settings, Save, Upload, Trash2, Image as ImageIcon, CheckCircle2, Eye, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCompanySettings, useUpdateCompanySettings } from '../features/settings/useSettings';
import Button from '../components/ui/Button';

export default function SettingsPage() {
    const { data: settingsRes, isLoading } = useCompanySettings();
    const updateSettings = useUpdateCompanySettings();
    const fileInputRef = useRef(null);

    const [divisionTab, setDivisionTab] = useState('print_shop');
    const [formData, setFormData] = useState({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        taxRegistrationNumber: '',
        receiptFooterMessage: '',
        logoUrl: '',
        tagline: 'BUSINESS MANAGEMENT SYSTEM',
        systemSubtitle: 'Smart wholesale inventory, POS, and financial management.',
        divisions: {
            print_shop: {
                name: 'Ink Printing Hub (pvt) Ltd',
                address: '',
                phone: '',
                email: '',
                tagline: 'PREMIUM QUALITY PRINTING & BRANDING SOLUTIONS',
                receiptFooterMessage: 'THANK YOU FOR YOUR PRINTING ORDER!\nPLEASE VISIT AGAIN.',
            },
            book_shop: {
                name: 'Pothmela Book Shop',
                address: '',
                phone: '',
                email: '',
                tagline: 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB',
                receiptFooterMessage: 'THANK YOU FOR SHOPPING AT POTHMELA!\nPLEASE VISIT AGAIN.',
            }
        }
    });

    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (settingsRes?.data) {
            const s = settingsRes.data;
            setFormData({
                companyName: s.companyName || '',
                address: s.address || '',
                phone: s.phone || '',
                email: s.email || '',
                website: s.website || '',
                taxRegistrationNumber: s.taxRegistrationNumber || '',
                receiptFooterMessage: s.receiptFooterMessage || '',
                logoUrl: s.logoUrl || '',
                tagline: s.tagline || 'BUSINESS MANAGEMENT SYSTEM',
                systemSubtitle: s.systemSubtitle || 'Smart wholesale inventory, POS, and financial management.',
                divisions: {
                    print_shop: {
                        name: s.divisions?.print_shop?.name || 'Ink Printing Hub (pvt) Ltd',
                        address: s.divisions?.print_shop?.address || '',
                        phone: s.divisions?.print_shop?.phone || '',
                        email: s.divisions?.print_shop?.email || '',
                        tagline: s.divisions?.print_shop?.tagline || 'PREMIUM QUALITY PRINTING & BRANDING SOLUTIONS',
                        receiptFooterMessage: s.divisions?.print_shop?.receiptFooterMessage || 'THANK YOU FOR YOUR PRINTING ORDER!\nPLEASE VISIT AGAIN.',
                    },
                    book_shop: {
                        name: s.divisions?.book_shop?.name || 'Pothmela Book Shop',
                        address: s.divisions?.book_shop?.address || '',
                        phone: s.divisions?.book_shop?.phone || '',
                        email: s.divisions?.book_shop?.email || '',
                        tagline: s.divisions?.book_shop?.tagline || 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB',
                        receiptFooterMessage: s.divisions?.book_shop?.receiptFooterMessage || 'THANK YOU FOR SHOPPING AT POTHMELA!\nPLEASE VISIT AGAIN.',
                    }
                }
            });
        }
    }, [settingsRes]);

    const handleDivisionChange = (div, field, value) => {
        setFormData(prev => ({
            ...prev,
            divisions: {
                ...prev.divisions,
                [div]: {
                    ...prev.divisions?.[div],
                    [field]: value
                }
            }
        }));
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileSelect = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
            return;
        }

        // Limit file size to 3MB for optimal speed
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image size must be less than 3MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Url = e.target.result;
            setFormData(prev => ({ ...prev, logoUrl: base64Url }));
            toast.success('Logo selected! Click "Save Settings" to apply.');
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logoUrl: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('Logo removed. Click "Save Settings" to apply.');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSettings.mutateAsync(formData);
            toast.success('Company settings & Logo updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-gray-500 font-medium animate-pulse">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="text-indigo-600" />
                        Company & Brand Settings
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure your company brand, logo, receipts, bills, and login page branding.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── LOGO UPLOAD SECTION ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="text-indigo-600 w-5 h-5" />
                        <h2 className="text-lg font-semibold text-gray-900">Company Logo</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        This logo will appear on the <strong>Login page</strong>, <strong>Sidebar</strong>, and all printed <strong>Bills & Invoices</strong>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Current Logo Preview */}
                        <div className="flex flex-col items-center justify-center p-5 bg-gray-50/80 rounded-2xl border border-gray-200">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Logo Preview</span>
                            {formData.logoUrl ? (
                                <div className="relative group">
                                    <div className="w-36 h-36 bg-white rounded-xl shadow-inner border border-gray-100 p-2 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={formData.logoUrl}
                                            alt="Company Logo Preview"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    >
                                        <Trash2 size={14} /> Remove Logo
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-2">
                                        <Building2 size={36} />
                                    </div>
                                    <p className="text-xs text-gray-400">No logo uploaded yet</p>
                                </div>
                            )}
                        </div>

                        {/* Drag and Drop Upload Box */}
                        <div className="md:col-span-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                                onChange={handleFileInputChange}
                                className="hidden"
                                id="logo-file-input"
                            />
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                    isDragging
                                        ? 'border-indigo-500 bg-indigo-50/50'
                                        : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50'
                                }`}
                            >
                                <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                                    <Upload size={22} />
                                </div>
                                <p className="text-sm font-semibold text-gray-700">
                                    Click to upload or drag & drop logo here
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    PNG, JPG, SVG or WebP (Recommended transparent background, max 3MB)
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition"
                                >
                                    <Upload size={14} /> Browse File
                                </button>
                            </div>

                            {/* Or direct URL */}
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Or paste Image URL:</label>
                                <input
                                    type="url"
                                    name="logoUrl"
                                    placeholder="https://example.com/logo.png"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                    className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BRAND & COMPANY DETAILS ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Brand Identity & ERP Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Brand Name *</label>
                            <input
                                type="text"
                                name="companyName"
                                required
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="e.g. Asipbook / Clay Art"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Shown across sidebar, top bar, bills & login header.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                            <input
                                type="text"
                                name="tagline"
                                value={formData.tagline}
                                onChange={handleChange}
                                placeholder="BUSINESS MANAGEMENT SYSTEM"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Shown below the logo on the login page.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">System Subtitle (Login Page)</label>
                            <input
                                type="text"
                                name="systemSubtitle"
                                value={formData.systemSubtitle}
                                onChange={handleChange}
                                placeholder="Smart wholesale inventory, POS, and financial management."
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Describes your system under the hero title.</p>
                        </div>
                    </div>
                </div>

                {/* ── CONTACT & BILLING DETAILS ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Contact & Billing Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+94 11 XXX XXXX"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@example.com"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Street, City, Country"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="www.yourcompany.com"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax / VAT Registration Number</label>
                            <input
                                type="text"
                                name="taxRegistrationNumber"
                                value={formData.taxRegistrationNumber}
                                onChange={handleChange}
                                placeholder="VAT-XXXXXXXX"
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer Message</label>
                            <textarea
                                name="receiptFooterMessage"
                                rows={3}
                                value={formData.receiptFooterMessage}
                                onChange={handleChange}
                                placeholder="THANK YOU FOR YOUR BUSINESS!&#10;PLEASE VISIT AGAIN."
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default message printed at the bottom of thermal receipts and bills.</p>
                        </div>
                    </div>
                </div>

                {/* ── DUAL DIVISIONS RECEIPT & PROFILE SETTINGS ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="text-blue-600" />
                                Division Profiles & Bill Headers
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Configure separate business names, addresses, and receipt headers for both divisions.
                            </p>
                        </div>

                        {/* Division Tab Switcher */}
                        <div className="inline-flex p-1 bg-gray-100 rounded-xl border">
                            <button
                                type="button"
                                onClick={() => setDivisionTab('print_shop')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                    divisionTab === 'print_shop' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                🖨️ Ink Printing Hub
                            </button>
                            <button
                                type="button"
                                onClick={() => setDivisionTab('book_shop')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                    divisionTab === 'book_shop' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                📘 Pothmela Book Shop
                            </button>
                        </div>
                    </div>

                    {/* Active Division Form Fields */}
                    {divisionTab === 'print_shop' && (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                                <span>🖨️ Ink Printing Hub (pvt) Ltd Configuration</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company / Bill Header Name</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.print_shop?.name || ''}
                                        onChange={(e) => handleDivisionChange('print_shop', 'name', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tagline</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.print_shop?.tagline || ''}
                                        onChange={(e) => handleDivisionChange('print_shop', 'tagline', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shop Address</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.print_shop?.address || ''}
                                        onChange={(e) => handleDivisionChange('print_shop', 'address', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.print_shop?.phone || ''}
                                        onChange={(e) => handleDivisionChange('print_shop', 'phone', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Thermal Receipt Footer</label>
                                    <textarea
                                        rows={2}
                                        value={formData.divisions?.print_shop?.receiptFooterMessage || ''}
                                        onChange={(e) => handleDivisionChange('print_shop', 'receiptFooterMessage', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none font-mono focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {divisionTab === 'book_shop' && (
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                <span>📘 Pothmela Book Shop Configuration</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company / Bill Header Name</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.book_shop?.name || ''}
                                        onChange={(e) => handleDivisionChange('book_shop', 'name', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tagline</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.book_shop?.tagline || ''}
                                        onChange={(e) => handleDivisionChange('book_shop', 'tagline', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shop Address</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.book_shop?.address || ''}
                                        onChange={(e) => handleDivisionChange('book_shop', 'address', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.divisions?.book_shop?.phone || ''}
                                        onChange={(e) => handleDivisionChange('book_shop', 'phone', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Thermal Receipt Footer</label>
                                    <textarea
                                        rows={2}
                                        value={formData.divisions?.book_shop?.receiptFooterMessage || ''}
                                        onChange={(e) => handleDivisionChange('book_shop', 'receiptFooterMessage', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none font-mono focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t flex justify-end">
                        <Button type="submit" variant="primary" loading={updateSettings.isPending}>
                            <Save size={18} className="mr-2" /> Save All Settings
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
