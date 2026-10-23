import React, { useState } from 'react';
import { Supplier, Product } from '../../types';
import { SupplierRepository } from '../../services/supplierRepository';
import { StorageService } from '../../services/storageService';
import { Truck, Phone, Mail, Clock, Plus, Star, X } from 'lucide-react';

interface SupplierManagementProps {
  suppliers: Supplier[];
  products: Product[];
  onRefreshData: () => void;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({
  suppliers,
  products,
  onRefreshData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('3');

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      contactPerson: contactPerson.trim() || 'Wholesale Manager',
      phone: phone.trim() || '9800000000',
      email: email.trim() || 'supplier@example.com',
      address: address.trim() || 'Wholesale Market',
      leadTimeDays: parseInt(leadTimeDays) || 3,
      productCount: 0,
      rating: 4.8
    };

    const res = await SupplierRepository.saveSupplier(newSup);
    if (res.error) {
      alert(res.error);
      return;
    }

    setIsModalOpen(false);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    onRefreshData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supplier Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Vendor lead times directly configure the demand forecasting and smart reorder recommendation calculations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suppliers.map(sup => {
          const linkedCount = products.filter(p => p.supplierId === sup.id).length;

          return (
            <div
              key={sup.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{sup.name}</h3>
                      <p className="text-[11px] text-slate-500">{sup.contactPerson}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold text-amber-800">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{sup.rating}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{sup.phone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{sup.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Lead Time: {sup.leadTimeDays} days</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  <span className="font-bold text-slate-900 font-mono">{linkedCount}</span> catalog products supplied
                </span>
                <span className="text-emerald-700 font-semibold">Active Vendor</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Add New Supplier</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parle Agro Logistics"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Lead Time (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leadTimeDays}
                    onChange={e => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="City, industrial area, PIN"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
