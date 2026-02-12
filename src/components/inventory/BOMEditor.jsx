import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { getPartCostAtDate, getSubAssemblyCostAtDate } from '../../services/costingService';

/**
 * BOM Editor component for managing product composition
 * @description Embedded component allowing users to add/remove parts and fasteners  
 * from a product's Bill of Materials with real-time cost calculation display.
 */
export const BOMEditor = ({
    bomEntries = [],
    bomFastenerEntries = [],
    bomSubAssemblyEntries = [],
    onAddPart,
    onRemovePart,
    onUpdateQuantity,
    onAddFastener,
    onRemoveFastener,
    onUpdateFastenerQuantity,
    onAddSubAssembly,
    onRemoveSubAssembly,
    onUpdateSubAssemblyQuantity,
    bomElectricalEntries = [],
    onAddElectrical,
    onRemoveElectrical,
    onUpdateElectricalQuantity,
    disabled = false
}) => {
    const [parts, setParts] = useState([]);
    const [fasteners, setFasteners] = useState([]);
    const [subAssemblies, setSubAssemblies] = useState([]);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [selectedFastenerId, setSelectedFastenerId] = useState('');
    const [selectedSubAssemblyId, setSelectedSubAssemblyId] = useState('');
    const [partQuantity, setPartQuantity] = useState('1');
    const [fastenerQuantity, setFastenerQuantity] = useState('1');
    const [subAssemblyQuantity, setSubAssemblyQuantity] = useState('1');
    const [partCosts, setPartCosts] = useState({});
    const [fastenerCosts, setFastenerCosts] = useState({});
    const [subAssemblyCosts, setSubAssemblyCosts] = useState({});
    const [electricalItems, setElectricalItems] = useState([]);
    const [selectedElectricalId, setSelectedElectricalId] = useState('');
    const [electricalQuantity, setElectricalQuantity] = useState('1');
    const [electricalCosts, setElectricalCosts] = useState({});

    // Load parts from catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            const partsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            partsList.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
            setParts(partsList);
        });

        return () => unsubscribe();
    }, []);

    // Load fasteners from catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'fastener_catalog'), (snap) => {
            const fastenersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fastenersList.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
            setFasteners(fastenersList);
        });

        return () => unsubscribe();
    }, []);

    // Load sub assemblies from catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sub_assemblies'), (snap) => {
            const subAssembliesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            subAssembliesList.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
            setSubAssemblies(subAssembliesList);
        });

        return () => unsubscribe();
    }, []);

    // Load electrical items from catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'electrical_catalog'), (snap) => {
            const electricalList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            electricalList.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
            setElectricalItems(electricalList);
        });

        return () => unsubscribe();
    }, []);

    // Load current costs for BOM parts
    useEffect(() => {
        const loadCosts = async () => {
            const costs = {};
            for (const entry of bomEntries) {
                try {
                    const cost = await getPartCostAtDate(entry.partId, new Date());
                    costs[entry.partId] = cost;
                } catch (error) {
                    console.error('Error loading part cost:', error);
                    costs[entry.partId] = 0;
                }
            }
            setPartCosts(costs);
        };

        if (bomEntries.length > 0) {
            loadCosts();
        }
    }, [bomEntries]);

    // Load current costs for BOM fasteners
    useEffect(() => {
        const loadFastenerCosts = async () => {
            const costs = {};
            for (const entry of bomFastenerEntries) {
                try {
                    const cost = await getPartCostAtDate(entry.fastenerId, new Date());
                    costs[entry.fastenerId] = cost;
                } catch (error) {
                    console.error('Error loading fastener cost:', error);
                    costs[entry.fastenerId] = 0;
                }
            }
            setFastenerCosts(costs);
        };

        if (bomFastenerEntries.length > 0) {
            loadFastenerCosts();
        }
    }, [bomFastenerEntries]);

    // Load current costs for BOM sub assemblies
    useEffect(() => {
        const loadSubAssemblyCosts = async () => {
            const costs = {};
            for (const entry of bomSubAssemblyEntries) {
                try {
                    const cost = await getSubAssemblyCostAtDate(entry.subAssemblyId, new Date());
                    costs[entry.subAssemblyId] = cost;
                } catch (error) {
                    console.error('Error loading sub assembly cost:', error);
                    costs[entry.subAssemblyId] = 0;
                }
            }
            setSubAssemblyCosts(costs);
        };

        if (bomSubAssemblyEntries.length > 0) {
            loadSubAssemblyCosts();
        }
    }, [bomSubAssemblyEntries]);

    // Load current costs for BOM electrical items
    useEffect(() => {
        const loadElectricalCosts = async () => {
            const costs = {};
            for (const entry of bomElectricalEntries) {
                try {
                    const cost = await getPartCostAtDate(entry.electricalId, new Date());
                    costs[entry.electricalId] = cost;
                } catch (error) {
                    console.error('Error loading electrical cost:', error);
                    costs[entry.electricalId] = 0;
                }
            }
            setElectricalCosts(costs);
        };

        if (bomElectricalEntries.length > 0) {
            loadElectricalCosts();
        }
    }, [bomElectricalEntries]);

    const handleAddPart = () => {
        if (!selectedPartId || !partQuantity || parseFloat(partQuantity) <= 0) {
            return;
        }

        onAddPart(selectedPartId, parseFloat(partQuantity));
        setSelectedPartId('');
        setPartQuantity('1');
    };

    const handleAddFastener = () => {
        if (!selectedFastenerId || !fastenerQuantity || parseFloat(fastenerQuantity) <= 0) {
            return;
        }

        onAddFastener(selectedFastenerId, parseFloat(fastenerQuantity));
        setSelectedFastenerId('');
        setFastenerQuantity('1');
    };

    const handleAddSubAssembly = () => {
        if (!selectedSubAssemblyId || !subAssemblyQuantity || parseFloat(subAssemblyQuantity) <= 0) {
            return;
        }

        onAddSubAssembly(selectedSubAssemblyId, parseFloat(subAssemblyQuantity));
        setSelectedSubAssemblyId('');
        setSubAssemblyQuantity('1');
    };

    const handleAddElectrical = () => {
        if (!selectedElectricalId || !electricalQuantity || parseFloat(electricalQuantity) <= 0) {
            return;
        }

        onAddElectrical(selectedElectricalId, parseFloat(electricalQuantity));
        setSelectedElectricalId('');
        setElectricalQuantity('1');
    };

    const handlePartQuantityChange = (partId, newQuantity) => {
        if (parseFloat(newQuantity) > 0) {
            onUpdateQuantity(partId, parseFloat(newQuantity));
        }
    };

    const handleFastenerQuantityChange = (fastenerId, newQuantity) => {
        if (parseFloat(newQuantity) > 0) {
            onUpdateFastenerQuantity(fastenerId, parseFloat(newQuantity));
        }
    };

    const handleSubAssemblyQuantityChange = (subAssemblyId, newQuantity) => {
        if (parseFloat(newQuantity) > 0) {
            onUpdateSubAssemblyQuantity(subAssemblyId, parseFloat(newQuantity));
        }
    };

    const handleElectricalQuantityChange = (electricalId, newQuantity) => {
        if (parseFloat(newQuantity) > 0) {
            onUpdateElectricalQuantity(electricalId, parseFloat(newQuantity));
        }
    };

    // Calculate parts subtotal
    const partsSubtotal = bomEntries.reduce((sum, entry) => {
        const partCost = partCosts[entry.partId] || 0;
        return sum + (partCost * entry.quantityUsed);
    }, 0);

    // Calculate fasteners subtotal
    const fastenersSubtotal = bomFastenerEntries.reduce((sum, entry) => {
        const fastenerCost = fastenerCosts[entry.fastenerId] || 0;
        return sum + (fastenerCost * entry.quantityUsed);
    }, 0);

    // Calculate sub assemblies subtotal
    const subAssembliesSubtotal = bomSubAssemblyEntries.reduce((sum, entry) => {
        const subAssemblyCost = subAssemblyCosts[entry.subAssemblyId] || 0;
        return sum + (subAssemblyCost * entry.quantityUsed);
    }, 0);

    // Calculate electrical subtotal
    const electricalSubtotal = bomElectricalEntries.reduce((sum, entry) => {
        const electricalCost = electricalCosts[entry.electricalId] || 0;
        return sum + (electricalCost * entry.quantityUsed);
    }, 0);

    // Total cost
    const totalCost = partsSubtotal + fastenersSubtotal + subAssembliesSubtotal + electricalSubtotal;

    // Filter out parts already in BOM
    const availableParts = parts.filter(p => !bomEntries.some(e => e.partId === p.id));

    // Filter out fasteners already in BOM
    const availableFasteners = fasteners.filter(f => !bomFastenerEntries.some(e => e.fastenerId === f.id));

    // Filter out sub assemblies already in BOM
    const availableSubAssemblies = subAssemblies.filter(sa => !bomSubAssemblyEntries.some(e => e.subAssemblyId === sa.id));

    // Filter out electrical items already in BOM
    const availableElectrical = electricalItems.filter(e => !bomElectricalEntries.some(be => be.electricalId === e.id));

    // Sort BOM entries by SKU
    const sortedBomEntries = useMemo(() => {
        return [...bomEntries].sort((a, b) => {
            const itemA = parts.find(p => p.id === a.partId);
            const itemB = parts.find(p => p.id === b.partId);
            return (itemA?.sku || '').localeCompare(itemB?.sku || '');
        });
    }, [bomEntries, parts]);

    const sortedBomFastenerEntries = useMemo(() => {
        return [...bomFastenerEntries].sort((a, b) => {
            const itemA = fasteners.find(f => f.id === a.fastenerId);
            const itemB = fasteners.find(f => f.id === b.fastenerId);
            return (itemA?.sku || '').localeCompare(itemB?.sku || '');
        });
    }, [bomFastenerEntries, fasteners]);

    const sortedBomSubAssemblyEntries = useMemo(() => {
        return [...bomSubAssemblyEntries].sort((a, b) => {
            const itemA = subAssemblies.find(s => s.id === a.subAssemblyId);
            const itemB = subAssemblies.find(s => s.id === b.subAssemblyId);
            return (itemA?.sku || '').localeCompare(itemB?.sku || '');
        });
    }, [bomSubAssemblyEntries, subAssemblies]);

    const sortedBomElectricalEntries = useMemo(() => {
        return [...bomElectricalEntries].sort((a, b) => {
            const itemA = electricalItems.find(e => e.id === a.electricalId);
            const itemB = electricalItems.find(e => e.id === b.electricalId);
            return (itemA?.sku || '').localeCompare(itemB?.sku || '');
        });
    }, [bomElectricalEntries, electricalItems]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                    Bill of Materials
                </label>
                <span className="text-xs text-slate-400">
                    {bomEntries.length + bomFastenerEntries.length + bomSubAssemblyEntries.length + bomElectricalEntries.length} item{(bomEntries.length + bomFastenerEntries.length + bomSubAssemblyEntries.length + bomElectricalEntries.length) !== 1 ? 's' : ''}
                </span>
            </div>

            {/* PARTS SECTION */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Icons.Package size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Parts</h3>
                    <span className="text-xs text-slate-500">({bomEntries.length})</span>
                </div>

                {/* Add Part Form */}
                {!disabled && (
                    <div className="flex gap-2">
                        <select
                            value={selectedPartId}
                            onChange={(e) => setSelectedPartId(e.target.value)}
                            className="flex-1 min-w-[400px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">Select a part...</option>
                            {availableParts.map(part => (
                                <option key={part.id} value={part.id}>
                                    {part.sku} - {part.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={partQuantity}
                            onChange={(e) => setPartQuantity(e.target.value)}
                            placeholder="Qty"
                            className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddPart}
                            disabled={!selectedPartId || !partQuantity}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Plus size={18} />
                        </button>
                    </div>
                )}

                {/* Parts List */}
                {bomEntries.length > 0 ? (
                    <div className="space-y-2">
                        {sortedBomEntries.map(entry => {
                            const part = parts.find(p => p.id === entry.partId);
                            const partCost = partCosts[entry.partId] || 0;
                            const subtotal = partCost * entry.quantityUsed;

                            return (
                                <div
                                    key={entry.partId}
                                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-white">
                                            {part?.sku || 'Unknown'} - {part?.name || 'Unknown Part'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            ${(partCost / 100).toFixed(2)} × {entry.quantityUsed} = ${(subtotal / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    {!disabled && (
                                        <>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={entry.quantityUsed}
                                                onChange={(e) => handlePartQuantityChange(entry.partId, e.target.value)}
                                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onRemovePart(entry.partId)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                title="Remove part"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Parts Subtotal */}
                        <div className="flex items-center justify-between p-2 px-3 bg-slate-800/30 rounded border border-slate-700/50">
                            <span className="text-sm text-slate-400">Parts Subtotal:</span>
                            <span className="text-sm font-semibold text-white">
                                ${(partsSubtotal / 100).toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-xs">No parts added</p>
                    </div>
                )}
            </div>

            {/* FASTENERS SECTION */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Icons.Wrench size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Fasteners</h3>
                    <span className="text-xs text-slate-500">({bomFastenerEntries.length})</span>
                </div>

                {/* Add Fastener Form */}
                {!disabled && (
                    <div className="flex gap-2">
                        <select
                            value={selectedFastenerId}
                            onChange={(e) => setSelectedFastenerId(e.target.value)}
                            className="flex-1 min-w-[400px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            <option value="">Select a fastener...</option>
                            {availableFasteners.map(fastener => (
                                <option key={fastener.id} value={fastener.id}>
                                    {fastener.sku} - {fastener.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={fastenerQuantity}
                            onChange={(e) => setFastenerQuantity(e.target.value)}
                            placeholder="Qty"
                            className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddFastener}
                            disabled={!selectedFastenerId || !fastenerQuantity}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Plus size={18} />
                        </button>
                    </div>
                )}

                {/* Fasteners List */}
                {bomFastenerEntries.length > 0 ? (
                    <div className="space-y-2">
                        {sortedBomFastenerEntries.map(entry => {
                            const fastener = fasteners.find(f => f.id === entry.fastenerId);
                            const fastenerCost = fastenerCosts[entry.fastenerId] || 0;
                            const subtotal = fastenerCost * entry.quantityUsed;

                            return (
                                <div
                                    key={entry.fastenerId}
                                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-white">
                                            {fastener?.sku || 'Unknown'} - {fastener?.name || 'Unknown Fastener'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            ${(fastenerCost / 100).toFixed(2)} × {entry.quantityUsed} = ${(subtotal / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    {!disabled && (
                                        <>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={entry.quantityUsed}
                                                onChange={(e) => handleFastenerQuantityChange(entry.fastenerId, e.target.value)}
                                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onRemoveFastener(entry.fastenerId)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                title="Remove fastener"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Fasteners Subtotal */}
                        <div className="flex items-center justify-between p-2 px-3 bg-slate-800/30 rounded border border-slate-700/50">
                            <span className="text-sm text-slate-400">Fasteners Subtotal:</span>
                            <span className="text-sm font-semibold text-white">
                                ${(fastenersSubtotal / 100).toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-xs">No fasteners added</p>
                    </div>
                )}
            </div>

            {/* SUB ASSEMBLIES SECTION */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Icons.Layers size={16} className="text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Sub Assemblies</h3>
                    <span className="text-xs text-slate-500">({bomSubAssemblyEntries.length})</span>
                </div>

                {/* Add Sub Assembly Form */}
                {!disabled && (
                    <div className="flex gap-2">
                        <select
                            value={selectedSubAssemblyId}
                            onChange={(e) => setSelectedSubAssemblyId(e.target.value)}
                            className="flex-1 min-w-[400px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Select a sub assembly...</option>
                            {availableSubAssemblies.map(subAssembly => (
                                <option key={subAssembly.id} value={subAssembly.id}>
                                    {subAssembly.sku} - {subAssembly.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={subAssemblyQuantity}
                            onChange={(e) => setSubAssemblyQuantity(e.target.value)}
                            placeholder="Qty"
                            className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddSubAssembly}
                            disabled={!selectedSubAssemblyId || !subAssemblyQuantity}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Plus size={18} />
                        </button>
                    </div>
                )}

                {/* Sub Assemblies List */}
                {bomSubAssemblyEntries.length > 0 ? (
                    <div className="space-y-2">
                        {sortedBomSubAssemblyEntries.map(entry => {
                            const subAssembly = subAssemblies.find(sa => sa.id === entry.subAssemblyId);
                            const subAssemblyCost = subAssemblyCosts[entry.subAssemblyId] || 0;
                            const subtotal = subAssemblyCost * entry.quantityUsed;

                            return (
                                <div
                                    key={entry.subAssemblyId}
                                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-white">
                                            {subAssembly?.sku || 'Unknown'} - {subAssembly?.name || 'Unknown Sub Assembly'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            ${(subAssemblyCost / 100).toFixed(2)} × {entry.quantityUsed} = ${(subtotal / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    {!disabled && (
                                        <>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={entry.quantityUsed}
                                                onChange={(e) => handleSubAssemblyQuantityChange(entry.subAssemblyId, e.target.value)}
                                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onRemoveSubAssembly(entry.subAssemblyId)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                title="Remove sub assembly"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Sub Assemblies Subtotal */}
                        <div className="flex items-center justify-between p-2 px-3 bg-slate-800/30 rounded border border-slate-700/50">
                            <span className="text-sm text-slate-400">Sub Assemblies Subtotal:</span>
                            <span className="text-sm font-semibold text-white">
                                ${(subAssembliesSubtotal / 100).toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-xs">No sub assemblies added</p>
                    </div>
                )}
            </div>

            {/* ELECTRICAL SECTION */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Icons.Zap size={16} className="text-yellow-400" />
                    <h3 className="text-sm font-semibold text-white">Electrical</h3>
                    <span className="text-xs text-slate-500">({bomElectricalEntries.length})</span>
                </div>

                {/* Add Electrical Form */}
                {!disabled && (
                    <div className="flex gap-2">
                        <select
                            value={selectedElectricalId}
                            onChange={(e) => setSelectedElectricalId(e.target.value)}
                            className="flex-1 min-w-[400px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                            <option value="">Select an electrical component...</option>
                            {availableElectrical.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.sku} - {item.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={electricalQuantity}
                            onChange={(e) => setElectricalQuantity(e.target.value)}
                            placeholder="Qty"
                            className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddElectrical}
                            disabled={!selectedElectricalId || !electricalQuantity}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Plus size={18} />
                        </button>
                    </div>
                )}

                {/* Electrical List */}
                {bomElectricalEntries.length > 0 ? (
                    <div className="space-y-2">
                        {sortedBomElectricalEntries.map(entry => {
                            const item = electricalItems.find(i => i.id === entry.electricalId);
                            const itemCost = electricalCosts[entry.electricalId] || 0;
                            const subtotal = itemCost * entry.quantityUsed;

                            return (
                                <div
                                    key={entry.electricalId}
                                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-white">
                                            {item?.sku || 'Unknown'} - {item?.name || 'Unknown Item'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            ${(itemCost / 100).toFixed(2)} × {entry.quantityUsed} = ${(subtotal / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    {!disabled && (
                                        <>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={entry.quantityUsed}
                                                onChange={(e) => handleElectricalQuantityChange(entry.electricalId, e.target.value)}
                                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onRemoveElectrical(entry.electricalId)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                title="Remove electrical item"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Electrical Subtotal */}
                        <div className="flex items-center justify-between p-2 px-3 bg-slate-800/30 rounded border border-slate-700/50">
                            <span className="text-sm text-slate-400">Electrical Subtotal:</span>
                            <span className="text-sm font-semibold text-white">
                                ${(electricalSubtotal / 100).toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500 bg-slate-800/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-xs">No electrical items added</p>
                    </div>
                )}
            </div>

            {/* Total Cost Display */}
            {(bomEntries.length > 0 || bomFastenerEntries.length > 0 || bomSubAssemblyEntries.length > 0 || bomElectricalEntries.length > 0) && (
                <div className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <span className="font-medium text-white">Total BOM Cost:</span>
                    <span className="text-lg font-bold text-cyan-400">
                        ${(totalCost / 100).toFixed(2)}
                    </span>
                </div>
            )}

            {(bomEntries.length === 0 && bomFastenerEntries.length === 0 && bomSubAssemblyEntries.length === 0 && bomElectricalEntries.length === 0) && (
                <div className="p-6 text-center text-slate-400 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                    <Icons.Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No items added yet</p>
                    <p className="text-xs mt-1">Add parts and fasteners above to build your BOM</p>
                </div>
            )}
        </div>
    );
};
