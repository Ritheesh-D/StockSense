import React, { useState } from 'react';
import { Customer } from '../../types';
import { StorageService } from '../../services/storageService';
import { Search, UserPlus, Check, X, Phone, User } from 'lucide-react';

interface CustomerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  initialAddMode?: boolean;
}

export const CustomerSelectorModal: React.FC<CustomerSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  onSelectCustomer,
  initialAddMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(initialAddMode);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setIsAddingNew(initialAddMode);
      setSearchTerm('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
    }
  }, [isOpen, initialAddMode]);

  if (!isOpen) return null;

  const customers = StorageService.getCustomers();
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const created = StorageService.addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined
    });

    onSelectCustomer(created);
    setIsAddingNew(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Select Customer</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!isAddingNew ? (
            <>
              {/* Search Bar & Add New Toggle */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1 border border-emerald-200 transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Walk-in Customer Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${
                  !selectedCustomer
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="font-semibold block">Walk-in Customer (General)</span>
                  <span className="text-xs text-slate-500">Standard counter retail customer without account</span>
                </div>
                {!selectedCustomer && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              {/* Customer List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">
                    No customers found matching &quot;{searchTerm}&quot;
                  </div>
                ) : (
                  filteredCustomers.map(cust => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    return (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          onSelectCustomer(cust);
                          onClose();
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
                            : 'border-transparent hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{cust.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{cust.phone}</span>
                            <span className="text-slate-300">·</span>
                            <span>{cust.totalVisits} visits</span>
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* New Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9820011223"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Back to Search
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
