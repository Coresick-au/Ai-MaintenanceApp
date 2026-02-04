import { useRef, useEffect, useState, useMemo } from 'react';
import { MapPin, Users, Briefcase, Plus, X, FileText, Search, ChevronDown } from 'lucide-react';
import type { JobDetails as JobDetailsType, Customer, Rates } from '../../types';

interface JobDetailsProps {
    jobDetails: JobDetailsType;
    setJobDetails: (details: JobDetailsType) => void;
    isLocked: boolean;
    savedCustomers: Customer[];
    setRates: (rates: Rates) => void;
    renameTechnician: (index: number, newName: string) => void;
    highlightMissingFields?: boolean;
}

export default function JobDetails({
    jobDetails, setJobDetails, isLocked, savedCustomers, setRates, renameTechnician, highlightMissingFields
}: JobDetailsProps) {

    const selectedCustomer = savedCustomers.find(c => c.name === jobDetails.customer);

    // Auto-expanding textarea ref
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    // Customer search state
    const [customerSearch, setCustomerSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Filter customers based on search query and sort alphabetically
    const filteredCustomers = useMemo(() => {
        let result = savedCustomers;
        if (customerSearch.trim()) {
            const query = customerSearch.toLowerCase();
            result = savedCustomers.filter(c => c.name.toLowerCase().includes(query));
        }
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [savedCustomers, customerSearch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setIsCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-resize description textarea based on content
    useEffect(() => {
        const textarea = descriptionRef.current;
        if (textarea) {
            // Reset height to auto to get accurate scrollHeight
            textarea.style.height = 'auto';
            // Set to scrollHeight, clamped between min (80px) and max (300px)
            const newHeight = Math.min(Math.max(textarea.scrollHeight, 80), 300);
            textarea.style.height = `${newHeight}px`;
        }
    }, [jobDetails.description]);

    const handleCustomerSelect = (customerName: string) => {
        const customer = savedCustomers.find(c => c.name === customerName);
        if (customer) {
            // Auto-populate location if this is a managed site
            const location = customer.managedSites && customer.managedSites.length > 0
                ? customer.managedSites[0].location
                : jobDetails.location;

            setJobDetails({ ...jobDetails, customer: customerName, location });
            setRates(customer.rates);
        } else {
            setJobDetails({ ...jobDetails, customer: customerName });
        }
        setIsCustomerDropdownOpen(false);
        setCustomerSearch('');
    };

    const addTechnician = () => {
        if (isLocked) return;
        // Always use Tech N pattern for new technicians
        const newTechName = `Tech ${jobDetails.technicians.length + 1} `;
        setJobDetails({ ...jobDetails, technicians: [...jobDetails.technicians, newTechName] });
    };

    const removeTechnician = (index: number) => {
        if (isLocked || jobDetails.technicians.length <= 1) return;
        const newTechs = jobDetails.technicians.filter((_, i) => i !== index);
        setJobDetails({ ...jobDetails, technicians: newTechs });
    };

    const updateTechnician = (index: number, value: string) => {
        if (isLocked) return;
        renameTechnician(index, value);
    };

    return (
        <div className="bg-bg-secondary p-6 rounded-lg shadow-sm border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold uppercase text-slate-200 tracking-wider">Job Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Customer Searchable Dropdown */}
                <div className="relative" ref={customerDropdownRef}>
                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                        <Briefcase size={16} /> Customer
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            disabled={isLocked}
                            value={isCustomerDropdownOpen ? customerSearch : (jobDetails.customer || '')}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                if (!isCustomerDropdownOpen) setIsCustomerDropdownOpen(true);
                            }}
                            onFocus={() => !isLocked && setIsCustomerDropdownOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsCustomerDropdownOpen(false);
                                    setCustomerSearch('');
                                } else if (e.key === 'Enter' && filteredCustomers.length === 1) {
                                    handleCustomerSelect(filteredCustomers[0].name);
                                }
                            }}
                            placeholder="Search customers..."
                            className={`w-full p-2 pr-8 border rounded-lg bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''} ${highlightMissingFields && !jobDetails.customer ? 'border-danger ring-1 ring-danger' : 'border-slate-700 hover:border-accent-primary'}`}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            {isCustomerDropdownOpen ? <Search size={16} /> : <ChevronDown size={16} />}
                        </div>
                    </div>
                    {isCustomerDropdownOpen && !isLocked && (
                        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-bg-tertiary border border-slate-700 rounded-lg shadow-lg">
                            {filteredCustomers.length === 0 ? (
                                <div className="p-3 text-slate-400 text-sm text-center">No customers found</div>
                            ) : (
                                filteredCustomers.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleCustomerSelect(c.name)}
                                        className={`w-full text-left px-3 py-2 hover:bg-accent-primary/20 text-slate-200 transition-colors ${jobDetails.customer === c.name ? 'bg-accent-primary/30 font-medium' : ''}`}
                                    >
                                        {c.name}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    {/* Customer Notes Display */}
                    {selectedCustomer?.customerNotes && (
                        <div className="mt-2 text-xs text-cyan-400">
                            <div className="flex items-start gap-1">
                                <span className="flex-shrink-0">📝</span>
                                <div className="flex-1">
                                    {selectedCustomer.customerNotes.split('\n').map((line, idx) => {
                                        // Check if line starts with number pattern like "1.", "2.", etc.
                                        const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
                                        if (numberedMatch) {
                                            return (
                                                <div key={idx} className="flex gap-1">
                                                    <span className="font-semibold">{numberedMatch[1]}.</span>
                                                    <span>{numberedMatch[2]}</span>
                                                </div>
                                            );
                                        }
                                        // Regular line
                                        return line.trim() ? <div key={idx} className="italic">{line}</div> : null;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Site-Specific Contacts */}
                    {selectedCustomer?.contacts && selectedCustomer.contacts.length > 0 && (
                        <div className="mt-2 text-xs text-emerald-400">
                            <div className="flex items-start gap-1">
                                <span className="flex-shrink-0">👤</span>
                                <div className="flex-1">
                                    <div className="font-semibold mb-1">Site Contacts:</div>
                                    {selectedCustomer.contacts.map((contact, idx) => (
                                        <div key={idx} className="ml-2">
                                            <span className="font-medium">{contact.name}</span>
                                            {contact.phone && <span className="ml-2">📞 {contact.phone}</span>}
                                            {contact.email && <span className="ml-2">✉️ {contact.email}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                        <MapPin size={16} /> Location
                    </label>
                    <input
                        type="text"
                        disabled={isLocked}
                        value={jobDetails.location}
                        onChange={(e) => setJobDetails({ ...jobDetails, location: e.target.value })}
                        className={`w-full p-2 border border-slate-700 rounded-lg bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all hover:border-accent-primary ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''}`}
                        placeholder="Site Location"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Users size={16} /> Technicians
                </label>
                <div className="flex flex-wrap gap-3">
                    {jobDetails.technicians.map((tech, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <input
                                type="text"
                                disabled={isLocked}
                                value={tech}
                                onChange={(e) => updateTechnician(index, e.target.value)}
                                className={`p-2 border border-slate-700 rounded-lg w-48 bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all hover:border-accent-primary ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''}`}
                                placeholder={`Tech ${index + 1} `}
                            />
                            {!isLocked && jobDetails.technicians.length > 1 && (
                                <button
                                    onClick={() => removeTechnician(index)}
                                    className="text-slate-400 hover:text-danger transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    {!isLocked && (
                        <button
                            onClick={addTechnician}
                            className="flex items-center gap-1 text-accent-primary hover:text-accent-hover font-medium px-3 py-2 rounded-lg hover:bg-accent-primary/10 transition-all border border-slate-700 hover:border-accent-primary hover:shadow-blue-glow"
                        >
                            <Plus size={16} /> Add Tech
                        </button>
                    )}
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Reporting Time (Hours)</label>
                    <input
                        type="number"
                        step="0.5"
                        disabled={isLocked}
                        value={jobDetails.reportingTime || 0}
                        onChange={(e) => setJobDetails({ ...jobDetails, reportingTime: parseFloat(e.target.value) || 0 })}
                        className={`p-2 border border-slate-700 rounded-lg w-full bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all hover:border-accent-primary ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''}`}
                    />
                </div>

                <div className="flex items-end gap-4">
                    <div className="flex items-center h-10 gap-2">
                        <input
                            type="checkbox"
                            id="includeTravelCharge"
                            disabled={isLocked}
                            checked={jobDetails.includeTravelCharge}
                            onChange={(e) => setJobDetails({ ...jobDetails, includeTravelCharge: e.target.checked })}
                            className="w-4 h-4 accent-accent-primary rounded focus:ring-2 focus:ring-accent-primary"
                        />
                        <label htmlFor="includeTravelCharge" className="text-sm font-medium text-slate-300 select-none cursor-pointer">
                            Include Travel Charge?
                        </label>
                    </div>


                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Description - Auto-expanding */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Description / Scope of Works</label>
                    <textarea
                        ref={descriptionRef}
                        disabled={isLocked}
                        value={jobDetails.description}
                        onChange={(e) => setJobDetails({ ...jobDetails, description: e.target.value })}
                        className={`w-full p-3 border border-slate-700 rounded-lg bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all hover:border-accent-primary overflow-y-auto ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''}`}
                        style={{ minHeight: '80px', maxHeight: '300px' }}
                        placeholder="Enter job description..."
                    />
                </div>

                {/* Technician Notes - NEW */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                        <FileText size={16} /> Technician Notes (Job Sheet Only)
                    </label>
                    <textarea
                        disabled={isLocked}
                        value={jobDetails.techNotes || ''}
                        onChange={(e) => setJobDetails({ ...jobDetails, techNotes: e.target.value })}
                        className={`w-full p-3 border border-slate-700 rounded-lg h-32 bg-bg-tertiary text-slate-200 focus:ring-2 focus:ring-accent-primary outline-none transition-all hover:border-accent-primary resize-none ${isLocked ? 'bg-bg-tertiary/50 opacity-50 text-slate-400' : ''}`}
                        placeholder="Specific instructions for the tech (e.g. Lockbox codes, safety warnings, site contact info)..."
                    />
                </div>
            </div>
        </div >
    );
}
