
import React, { useState } from 'react';
import { usePurchase } from '../context/PurchaseContext';
import { Supplier } from '../types';
import { useNavigate } from 'react-router-dom';

const SuppliersPage: React.FC = () => {
  const { suppliers, addSupplier, getSupplierBalance } = usePurchase();
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Updated formData type to Omit companyId as well to align with addSupplier definition in PurchaseContext
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'companyId'>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
    openingBalance: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier(formData);
    setShowForm(false);
    setFormData({ name: '', phone: '', email: '', address: '', gstNo: '', openingBalance: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Master</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your supply chain partners and payables.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(sup => {
          const balance = getSupplierBalance(sup.id);
          return (
            <div key={sup.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <span className="text-xl font-bold">{sup.name.charAt(0)}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding</p>
                  <p className={`text-lg font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                    ${balance.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-1">{sup.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{sup.gstNo}</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {sup.phone}
                </div>
                <div className="flex items-center text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {sup.email}
                </div>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => navigate(`/suppliers/ledger/${sup.id}`)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  View Ledger
                </button>
                <button className="flex-1 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">
                  New Payment
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Add New Supplier</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Supplier Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Phone</label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Address</label>
                  <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">GST No</label>
                  <input required type="text" value={formData.gstNo} onChange={e => setFormData({...formData, gstNo: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Opening Balance ($)</label>
                  <input required type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
