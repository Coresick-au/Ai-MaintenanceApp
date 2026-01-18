import React, { useState } from 'react';
import { PartCatalogTable } from '../components/inventory/PartCatalogTable';
import { PartCatalogModal } from '../components/inventory/PartCatalogModal';
import { ProductCatalogTable } from '../components/inventory/ProductCatalogTable';
import { ProductCatalogModal } from '../components/inventory/ProductCatalogModal';
import { SubAssemblyCatalogTable } from '../components/inventory/SubAssemblyCatalogTable';
import { SubAssemblyCatalogModal } from '../components/inventory/SubAssemblyCatalogModal';
import { LocationManager } from '../components/inventory/LocationManager';
import { SupplierManager } from '../components/inventory/SupplierManager';
import { StockOverview } from '../components/inventory/StockOverview';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { SerializedAssetsView } from '../components/inventory/SerializedAssetsView';
import { StockMovementHistory } from '../components/inventory/StockMovementHistory';
import { CategoryManager } from '../components/inventory/categories/CategoryManager';
import { CategoryProvider } from '../context/CategoryContext';
import { FastenerCatalogTable } from '../components/inventory/FastenerCatalogTable';
import { FastenerCatalogModal } from '../components/inventory/FastenerCatalogModal';
import { ElectricalCatalogTable } from '../components/inventory/ElectricalCatalogTable';
import { ElectricalCatalogModal } from '../components/inventory/ElectricalCatalogModal';
import { LabourRateModal } from '../components/settings/LabourRateModal';
import { TemplateManager } from '../components/inventory/TemplateManager';
import { ManufacturedPartCalculator } from '../components/inventory/ManufacturedPartCalculator';
import { SpecializedComponentsView } from '../components/inventory/SpecializedComponentsView';

import { BuildGuideManager } from '../components/inventory/BuildGuideManager';
import { SitePartManager } from '../components/inventory/SitePartManager';
import { Icons } from '../constants/icons';
import BackButton from '../components/ui/BackButton';

export function InventoryApp({ onBack }) {
    const [activeTab, setActiveTab] = useState('catalog');
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
    const [adjustingPart, setAdjustingPart] = useState(null);
    const [refreshProductCosts, setRefreshProductCosts] = useState(0);

    // Fastener catalog state
    const [showFastenerModal, setShowFastenerModal] = useState(false);
    const [editingFastener, setEditingFastener] = useState(null);

    // Sub Assembly catalog state
    const [isSubAssemblyModalOpen, setIsSubAssemblyModalOpen] = useState(false);
    const [editingSubAssembly, setEditingSubAssembly] = useState(null);



    // Electrical catalog state
    const [isElectricalModalOpen, setIsElectricalModalOpen] = useState(false);
    const [editingElectrical, setEditingElectrical] = useState(null);

    const [showLabourRateModal, setShowLabourRateModal] = useState(false);
    const [showManufacturedCalculator, setShowManufacturedCalculator] = useState(false);

    const handleAddPart = () => {
        setEditingPart(null);
        setIsPartModalOpen(true);
    };

    const handleEditPart = (part) => {
        setEditingPart(part);
        setIsPartModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsPartModalOpen(false);
        setEditingPart(null);
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
        setEditingProduct(null);
    };

    const handleAddFastener = () => {
        setEditingFastener(null);
        setShowFastenerModal(true);
    };

    const handleEditFastener = (fastener) => {
        setEditingFastener(fastener);
        setShowFastenerModal(true);
    };

    const handleCloseFastenerModal = () => {
        setShowFastenerModal(false);
        setEditingFastener(null);
    };

    const handleAddSubAssembly = () => {
        setEditingSubAssembly(null);
        setIsSubAssemblyModalOpen(true);
    };

    const handleEditSubAssembly = (subAssembly) => {
        setEditingSubAssembly(subAssembly);
        setIsSubAssemblyModalOpen(true);
    };

    const handleCloseSubAssemblyModal = () => {
        setIsSubAssemblyModalOpen(false);
        setEditingSubAssembly(null);
    };

    const handleAddElectrical = () => {
        setEditingElectrical(null);
        setIsElectricalModalOpen(true);
    };

    const handleEditElectrical = (item) => {
        setEditingElectrical(item);
        setIsElectricalModalOpen(true);
    };

    const handleCloseElectricalModal = () => {
        setIsElectricalModalOpen(false);
        setEditingElectrical(null);
    };

    const handleAdjustStock = (part) => {
        setAdjustingPart(part);
        setIsStockAdjustmentOpen(true);
    };

    const handleCloseStockAdjustment = () => {
        setIsStockAdjustmentOpen(false);
        setAdjustingPart(null);
    };

    // Listen for calculator open event from TemplateManager
    React.useEffect(() => {
        const handleOpenCalculator = () => {
            setShowManufacturedCalculator(true);
        };
        window.addEventListener('openManufacturedCalculator', handleOpenCalculator);
        return () => {
            window.removeEventListener('openManufacturedCalculator', handleOpenCalculator);
        };
    }, []);

    const tabs = [
        { id: 'catalog', label: 'Part Catalog', icon: Icons.Package },
        { id: 'fasteners', label: 'Fastener Catalog', icon: Icons.Wrench },
        { id: 'electrical', label: 'Electrical Catalog', icon: Icons.Zap },
        { id: 'subassemblies', label: 'Sub Assemblies', icon: Icons.Layers },
        { id: 'products', label: 'Product Catalog', icon: Icons.Box },
        { id: 'serialized', label: 'Serialized Assets', icon: Icons.Barcode },
        { id: 'specialized', label: 'Specialized', icon: Icons.Scale },
        { id: 'siteparts', label: 'Site Parts', icon: Icons.Tag },
        { id: 'buildguides', label: 'Build Guides', icon: Icons.BookOpen },
        { id: 'stock', label: 'Stock Levels', icon: Icons.Database },
        { id: 'categories', label: 'Categories', icon: Icons.FolderTree },
        { id: 'suppliers', label: 'Suppliers', icon: Icons.Truck }
    ];

    return (
        <CategoryProvider>
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
                {/* Header */}
                <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Unified Back Button */}
                            <BackButton label="Back to Portal" onClick={onBack} />
                            <div className="border-l border-slate-600 pl-4">
                                <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
                                <p className="text-sm text-slate-400 mt-1">Track parts, stock levels, and serialized assets</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLabourRateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                title="Labour Rate Settings"
                            >
                                <Icons.Settings size={18} />
                                Settings
                            </button>
                        </div>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="bg-slate-800/60 border-b border-slate-700 px-6">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/50'
                                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 p-6">
                    <div className="w-full h-full">
                        {activeTab === 'catalog' && (
                            <PartCatalogTable
                                onAddPart={handleAddPart}
                                onEditPart={handleEditPart}
                            />
                        )}

                        {activeTab === 'fasteners' && (
                            <FastenerCatalogTable
                                onAddFastener={handleAddFastener}
                                onEditFastener={handleEditFastener}
                            />
                        )}

                        {activeTab === 'electrical' && (
                            <ElectricalCatalogTable
                                onAddElectrical={handleAddElectrical}
                                onEditElectrical={handleEditElectrical}
                            />
                        )}

                        {activeTab === 'products' && (
                            <ProductCatalogTable
                                onAddProduct={handleAddProduct}
                                onEditProduct={handleEditProduct}
                                refreshTrigger={refreshProductCosts}
                            />
                        )}

                        {activeTab === 'subassemblies' && (
                            <SubAssemblyCatalogTable
                                onAddSubAssembly={handleAddSubAssembly}
                                onEditSubAssembly={handleEditSubAssembly}
                            />
                        )}

                        {activeTab === 'buildguides' && <BuildGuideManager />}

                        {activeTab === 'stock' && (
                            <StockOverview
                                onAdjustStock={handleAdjustStock}
                                LocationManager={LocationManager}
                                StockMovementHistory={StockMovementHistory}
                            />
                        )}

                        {activeTab === 'serialized' && <SerializedAssetsView />}

                        {activeTab === 'specialized' && <SpecializedComponentsView />}

                        {activeTab === 'siteparts' && <SitePartManager />}



                        {activeTab === 'categories' && <CategoryManager />}

                        {activeTab === 'suppliers' && <SupplierManager />}
                    </div>
                </main>

                {/* Modals */}
                <PartCatalogModal
                    isOpen={isPartModalOpen}
                    onClose={handleCloseModal}
                    editingPart={editingPart}
                />
                <ProductCatalogModal
                    isOpen={isProductModalOpen}
                    onClose={handleCloseProductModal}
                    editingProduct={editingProduct}
                    onSuccess={() => setRefreshProductCosts(prev => prev + 1)}
                />
                <FastenerCatalogModal
                    isOpen={showFastenerModal}
                    onClose={handleCloseFastenerModal}
                    editingFastener={editingFastener}
                />
                <ElectricalCatalogModal
                    isOpen={isElectricalModalOpen}
                    onClose={handleCloseElectricalModal}
                    editingItem={editingElectrical}
                />

                <LabourRateModal
                    isOpen={showLabourRateModal}
                    onClose={() => setShowLabourRateModal(false)}
                />
                <SubAssemblyCatalogModal
                    isOpen={isSubAssemblyModalOpen}
                    onClose={handleCloseSubAssemblyModal}
                    editingSubAssembly={editingSubAssembly}
                />
                <StockAdjustmentModal
                    isOpen={isStockAdjustmentOpen}
                    onClose={handleCloseStockAdjustment}
                    part={adjustingPart}
                />

                {/* Manufactured Part Calculator */}
                <ManufacturedPartCalculator
                    isOpen={showManufacturedCalculator}
                    onClose={() => setShowManufacturedCalculator(false)}
                />
            </div>
        </CategoryProvider>
    );
}
