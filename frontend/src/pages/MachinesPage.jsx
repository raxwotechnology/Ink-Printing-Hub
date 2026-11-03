import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Printer, Wrench, Plus, Search, Calendar, DollarSign,
    CheckCircle, AlertTriangle, Clock, Trash2, Edit2, FileText, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { machinesApi } from '../features/machines/machinesApi';

const MACHINE_TYPES = [
    { value: 'digital_printer', label: 'Digital Printer / Press' },
    { value: 'offset_press', label: 'Offset Press' },
    { value: 'plotter', label: 'Large Format Plotter' },
    { value: 'riso', label: 'Risograph / Duplicator' },
    { value: 'cutter', label: 'Guillotine Paper Cutter' },
    { value: 'laminator', label: 'Thermal / Roll Laminator' },
    { value: 'binder', label: 'Perfect / Spiral Binder' },
    { value: 'scanner', label: 'Production Scanner' },
    { value: 'other', label: 'Other Print Equipment' },
];

const MACHINE_STATUSES = [
    { value: 'operational', label: 'Operational (Working)', badge: 'success' },
    { value: 'maintenance_needed', label: 'Maintenance Needed', badge: 'warning' },
    { value: 'under_repair', label: 'Under Repair (Breakdown)', badge: 'danger' },
    { value: 'decommissioned', label: 'Decommissioned / Sold', badge: 'default' },
];

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'currency', currency: 'LKR', minimumFractionDigits: 2
}).format(n || 0);

export default function MachinesPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('machines'); // 'machines' | 'repairs'
    const [search, setSearch] = useState('');
    const [selectedMachineFilter, setSelectedMachineFilter] = useState('');

    // Modals
    const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
    const [isLogRepairModalOpen, setIsLogRepairModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState(null);

    // Form state for Machine
    const [machineForm, setMachineForm] = useState({
        name: '',
        brand: '',
        modelNumber: '',
        serialNumber: '',
        machineType: 'digital_printer',
        status: 'operational',
        location: 'Print Shop Floor',
        purchasePrice: '',
        notes: '',
    });

    // Form state for Repair
    const [repairForm, setRepairForm] = useState({
        machineId: '',
        repairDate: new Date().toISOString().split('T')[0],
        issueDescription: '',
        diagnosis: '',
        workDone: '',
        technicianName: '',
        technicianPhone: '',
        serviceCenter: '',
        partsCost: 0,
        laborCost: 0,
        status: 'completed',
        notes: '',
        autoRecordExpense: true,
    });

    // Queries
    const { data: machinesData, isLoading: isLoadingMachines } = useQuery({
        queryKey: ['machines', search],
        queryFn: () => machinesApi.getMachines({ search }),
    });
    const machines = machinesData?.data || [];

    const { data: repairsData, isLoading: isLoadingRepairs } = useQuery({
        queryKey: ['machine-repairs', selectedMachineFilter],
        queryFn: () => machinesApi.getRepairs({ machineId: selectedMachineFilter || undefined }),
    });
    const repairs = repairsData?.data || [];

    // Mutations
    const createMachineMutation = useMutation({
        mutationFn: machinesApi.createMachine,
        onSuccess: () => {
            queryClient.invalidateQueries(['machines']);
            toast.success('Machine added successfully');
            setIsAddMachineModalOpen(false);
            resetMachineForm();
        },
        onError: (err) => toast.error(err.response?.data?.message || err.message)
    });

    const updateMachineMutation = useMutation({
        mutationFn: ({ id, data }) => machinesApi.updateMachine(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['machines']);
            toast.success('Machine updated successfully');
            setIsAddMachineModalOpen(false);
            setEditingMachine(null);
            resetMachineForm();
        },
        onError: (err) => toast.error(err.response?.data?.message || err.message)
    });

    const deleteMachineMutation = useMutation({
        mutationFn: machinesApi.deleteMachine,
        onSuccess: () => {
            queryClient.invalidateQueries(['machines']);
            toast.success('Machine removed');
        },
        onError: (err) => toast.error(err.response?.data?.message || err.message)
    });

    const createRepairMutation = useMutation({
        mutationFn: machinesApi.createRepair,
        onSuccess: () => {
            queryClient.invalidateQueries(['machine-repairs']);
            queryClient.invalidateQueries(['machines']);
            queryClient.invalidateQueries(['expenses']);
            toast.success('Repair & maintenance logged! (Added to Print Shop expenses)');
            setIsLogRepairModalOpen(false);
            resetRepairForm();
        },
        onError: (err) => toast.error(err.response?.data?.message || err.message)
    });

    const deleteRepairMutation = useMutation({
        mutationFn: machinesApi.deleteRepair,
        onSuccess: () => {
            queryClient.invalidateQueries(['machine-repairs']);
            queryClient.invalidateQueries(['machines']);
            queryClient.invalidateQueries(['expenses']);
            toast.success('Repair record removed');
        },
        onError: (err) => toast.error(err.response?.data?.message || err.message)
    });

    const resetMachineForm = () => {
        setMachineForm({
            name: '',
            brand: '',
            modelNumber: '',
            serialNumber: '',
            machineType: 'digital_printer',
            status: 'operational',
            location: 'Print Shop Floor',
            purchasePrice: '',
            notes: '',
        });
        setEditingMachine(null);
    };

    const resetRepairForm = () => {
        setRepairForm({
            machineId: machines[0]?._id || '',
            repairDate: new Date().toISOString().split('T')[0],
            issueDescription: '',
            diagnosis: '',
            workDone: '',
            technicianName: '',
            technicianPhone: '',
            serviceCenter: '',
            partsCost: 0,
            laborCost: 0,
            status: 'completed',
            notes: '',
            autoRecordExpense: true,
        });
    };

    const openEditMachine = (m) => {
        setEditingMachine(m);
        setMachineForm({
            name: m.name || '',
            brand: m.brand || '',
            modelNumber: m.modelNumber || '',
            serialNumber: m.serialNumber || '',
            machineType: m.machineType || 'digital_printer',
            status: m.status || 'operational',
            location: m.location || 'Print Shop Floor',
            purchasePrice: m.purchasePrice || '',
            notes: m.notes || '',
        });
        setIsAddMachineModalOpen(true);
    };

    const handleSaveMachine = (e) => {
        e.preventDefault();
        if (!machineForm.name.trim()) return toast.error('Machine name is required');
        if (editingMachine) {
            updateMachineMutation.mutate({ id: editingMachine._id, data: machineForm });
        } else {
            createMachineMutation.mutate(machineForm);
        }
    };

    const handleSaveRepair = (e) => {
        e.preventDefault();
        if (!repairForm.machineId) return toast.error('Select a machine');
        if (!repairForm.issueDescription.trim()) return toast.error('Describe the issue / maintenance work');
        createRepairMutation.mutate(repairForm);
    };

    // Metrics
    const totalRepairSpend = machines.reduce((sum, m) => sum + (m.totalRepairCost || 0), 0);
    const operationalCount = machines.filter(m => m.status === 'operational').length;
    const maintenanceCount = machines.filter(m => m.status === 'under_repair' || m.status === 'maintenance_needed').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Print Shop Machines & Maintenance"
                description="Manage printing equipment, track maintenance logs, and monitor repair costs for Ink Printing Hub (pvt) Ltd."
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                resetRepairForm();
                                setIsLogRepairModalOpen(true);
                            }}
                        >
                            <Wrench size={16} className="mr-1.5 text-blue-600" /> Log Repair / Service
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                resetMachineForm();
                                setIsAddMachineModalOpen(true);
                            }}
                        >
                            <Plus size={16} className="mr-1.5" /> Add Machine
                        </Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Printer size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Equipment</p>
                        <h3 className="text-2xl font-black text-gray-900">{machines.length}</h3>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Operational</p>
                        <h3 className="text-2xl font-black text-emerald-700">{operationalCount}</h3>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Under Maintenance</p>
                        <h3 className="text-2xl font-black text-amber-700">{maintenanceCount}</h3>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Repair Cost</p>
                        <h3 className="text-xl font-black text-rose-700">{fmt(totalRepairSpend)}</h3>
                    </div>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('machines')}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'machines'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Printer size={16} /> Machines Directory ({machines.length})
                </button>
                <button
                    onClick={() => setActiveTab('repairs')}
                    className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'repairs'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Wrench size={16} /> Maintenance & Repair History ({repairs.length})
                </button>
            </div>

            {/* Tab 1: Machines Directory */}
            {activeTab === 'machines' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search machines by name, code, brand..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {isLoadingMachines ? (
                        <div className="py-12 text-center text-gray-500">Loading equipment...</div>
                    ) : machines.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Printer className="mx-auto text-gray-300 mb-3" size={48} />
                            <h3 className="text-lg font-bold text-gray-800 mb-1">No printing machines registered yet</h3>
                            <p className="text-sm text-gray-500 mb-4">Add your printers, cutters, and presses to start tracking maintenance and repair expenses.</p>
                            <Button variant="primary" onClick={() => setIsAddMachineModalOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add First Machine
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {machines.map((m) => {
                                const st = MACHINE_STATUSES.find(s => s.value === m.status);
                                return (
                                    <Card key={m._id} className="p-5 flex flex-col justify-between hover:shadow-md transition">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{m.machineCode}</span>
                                                    <h4 className="text-base font-bold text-gray-900 leading-tight">{m.name}</h4>
                                                    <p className="text-xs text-gray-500">{m.brand} {m.modelNumber ? `• ${m.modelNumber}` : ''}</p>
                                                </div>
                                                <Badge variant={st?.badge || 'default'}>
                                                    {st?.label || m.status}
                                                </Badge>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-100 text-xs space-y-1.5 text-gray-600">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Type:</span>
                                                    <span className="font-semibold text-gray-800 capitalize">{m.machineType?.replace('_', ' ')}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Total Repairs:</span>
                                                    <span className="font-bold text-rose-600">{fmt(m.totalRepairCost)}</span>
                                                </div>
                                                {m.lastServicedAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Last Serviced:</span>
                                                        <span>{new Date(m.lastServicedAt).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {m.serialNumber && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Serial No:</span>
                                                        <span className="font-mono">{m.serialNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    setRepairForm(prev => ({ ...prev, machineId: m._id }));
                                                    setIsLogRepairModalOpen(true);
                                                }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                <Wrench size={13} /> Log Service
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditMachine(m)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                                                    title="Edit Machine"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Delete ${m.name}?`)) {
                                                            deleteMachineMutation.mutate(m._id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50"
                                                    title="Delete Machine"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Repairs & Maintenance History */}
            {activeTab === 'repairs' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedMachineFilter}
                            onChange={(e) => setSelectedMachineFilter(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-700 outline-none"
                        >
                            <option value="">All Machines</option>
                            {machines.map(m => (
                                <option key={m._id} value={m._id}>{m.name} ({m.machineCode})</option>
                            ))}
                        </select>
                    </div>

                    {isLoadingRepairs ? (
                        <div className="py-12 text-center text-gray-500">Loading repairs...</div>
                    ) : repairs.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Wrench className="mx-auto text-gray-300 mb-3" size={48} />
                            <h3 className="text-lg font-bold text-gray-800 mb-1">No repairs logged yet</h3>
                            <p className="text-sm text-gray-500 mb-4">When a machine has maintenance, replacement parts, or technician fees, record it here.</p>
                            <Button variant="primary" onClick={() => setIsLogRepairModalOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Log First Repair
                            </Button>
                        </Card>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm text-gray-700">
                                <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Repair Code</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Machine</th>
                                        <th className="py-3 px-4">Issue / Maintenance Work</th>
                                        <th className="py-3 px-4">Technician / Workshop</th>
                                        <th className="py-3 px-4 text-right">Cost (LKR)</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {repairs.map(r => (
                                        <tr key={r._id} className="hover:bg-gray-50/80 transition">
                                            <td className="py-3 px-4 font-mono font-bold text-xs text-blue-600">{r.repairCode}</td>
                                            <td className="py-3 px-4 text-xs">{new Date(r.repairDate).toLocaleDateString()}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-gray-900">{r.machineId?.name || 'Machine'}</div>
                                                <div className="text-[11px] text-gray-400">{r.machineId?.machineCode}</div>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="font-semibold text-gray-800 line-clamp-1">{r.issueDescription}</div>
                                                {r.workDone && <div className="text-xs text-gray-500 line-clamp-1">{r.workDone}</div>}
                                            </td>
                                            <td className="py-3 px-4 text-xs">
                                                <div>{r.technicianName || r.serviceCenter || '—'}</div>
                                                {r.technicianPhone && <div className="text-gray-400">{r.technicianPhone}</div>}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-rose-600">
                                                {fmt(r.totalCost)}
                                                {r.partsCost > 0 && (
                                                    <div className="text-[10px] text-gray-400">Parts: {fmt(r.partsCost)}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>
                                                    {r.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Delete this repair record? The associated expense will also be removed.')) {
                                                            deleteRepairMutation.mutate(r._id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-700 rounded-md hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Add / Edit Machine */}
            <Modal
                isOpen={isAddMachineModalOpen}
                onClose={() => {
                    setIsAddMachineModalOpen(false);
                    setEditingMachine(null);
                }}
                title={editingMachine ? 'Edit Machine Details' : 'Register New Machine'}
            >
                <form onSubmit={handleSaveMachine} className="space-y-4">
                    <Input
                        label="Machine Name *"
                        placeholder="e.g. Canon imageRUNNER Advance, Heidelberg GTO 52"
                        value={machineForm.name}
                        onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Brand / Manufacturer"
                            placeholder="e.g. Canon, Epson, Xerox, Heidelberg"
                            value={machineForm.brand}
                            onChange={(e) => setMachineForm({ ...machineForm, brand: e.target.value })}
                        />
                        <Input
                            label="Model Number"
                            placeholder="e.g. C5535i, L1800"
                            value={machineForm.modelNumber}
                            onChange={(e) => setMachineForm({ ...machineForm, modelNumber: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Equipment Type</label>
                            <select
                                value={machineForm.machineType}
                                onChange={(e) => setMachineForm({ ...machineForm, machineType: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {MACHINE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Current Status</label>
                            <select
                                value={machineForm.status}
                                onChange={(e) => setMachineForm({ ...machineForm, status: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {MACHINE_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Serial Number"
                            placeholder="Serial / Barcode"
                            value={machineForm.serialNumber}
                            onChange={(e) => setMachineForm({ ...machineForm, serialNumber: e.target.value })}
                        />
                        <Input
                            label="Floor / Location"
                            placeholder="e.g. Print Shop Floor, Room A"
                            value={machineForm.location}
                            onChange={(e) => setMachineForm({ ...machineForm, location: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Notes / Specification"
                        placeholder="Max paper size, speed, voltage requirements..."
                        value={machineForm.notes}
                        onChange={(e) => setMachineForm({ ...machineForm, notes: e.target.value })}
                    />

                    <div className="pt-4 flex justify-end gap-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsAddMachineModalOpen(false);
                                setEditingMachine(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingMachine ? 'Save Changes' : 'Register Machine'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Log Repair / Maintenance */}
            <Modal
                isOpen={isLogRepairModalOpen}
                onClose={() => setIsLogRepairModalOpen(false)}
                title="Log Machine Repair & Maintenance"
            >
                <form onSubmit={handleSaveRepair} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Select Machine *</label>
                        <select
                            value={repairForm.machineId}
                            onChange={(e) => setRepairForm({ ...repairForm, machineId: e.target.value })}
                            required
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Choose Machine --</option>
                            {machines.map(m => (
                                <option key={m._id} value={m._id}>{m.name} ({m.machineCode})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Repair / Service Date *"
                            value={repairForm.repairDate}
                            onChange={(e) => setRepairForm({ ...repairForm, repairDate: e.target.value })}
                            required
                        />
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status</label>
                            <select
                                value={repairForm.status}
                                onChange={(e) => setRepairForm({ ...repairForm, status: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="completed">Completed (Fixed)</option>
                                <option value="in_progress">In Progress</option>
                                <option value="pending">Pending Parts / Tech</option>
                            </select>
                        </div>
                    </div>

                    <Input
                        label="Issue / Reason for Service *"
                        placeholder="e.g. Paper jam sensor error, drum unit replacement, periodic servicing"
                        value={repairForm.issueDescription}
                        onChange={(e) => setRepairForm({ ...repairForm, issueDescription: e.target.value })}
                        required
                    />

                    <Input
                        label="Work Done / Solution"
                        placeholder="e.g. Replaced pickup roller, cleaned laser optics"
                        value={repairForm.workDone}
                        onChange={(e) => setRepairForm({ ...repairForm, workDone: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Technician / Engineer Name"
                            placeholder="e.g. Nimal Perera"
                            value={repairForm.technicianName}
                            onChange={(e) => setRepairForm({ ...repairForm, technicianName: e.target.value })}
                        />
                        <Input
                            label="Service Center / Company"
                            placeholder="e.g. Metropolitan, Dynamic Technologies"
                            value={repairForm.serviceCenter}
                            onChange={(e) => setRepairForm({ ...repairForm, serviceCenter: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl border">
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            label="Spare Parts Cost (LKR)"
                            value={repairForm.partsCost}
                            onChange={(e) => setRepairForm({ ...repairForm, partsCost: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            label="Labor / Service Fee (LKR)"
                            value={repairForm.laborCost}
                            onChange={(e) => setRepairForm({ ...repairForm, laborCost: parseFloat(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-blue-900">Total Repair Expense:</p>
                            <p className="text-xs text-blue-700">Auto-links to Ink Printing Hub accounts</p>
                        </div>
                        <p className="text-xl font-black text-blue-800">
                            {fmt((parseFloat(repairForm.partsCost) || 0) + (parseFloat(repairForm.laborCost) || 0))}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="autoExpense"
                            checked={repairForm.autoRecordExpense}
                            onChange={(e) => setRepairForm({ ...repairForm, autoRecordExpense: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="autoExpense" className="text-xs font-medium text-gray-700">
                            Automatically record this under Print Shop Expenses
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLogRepairModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Save Repair & Expense
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
