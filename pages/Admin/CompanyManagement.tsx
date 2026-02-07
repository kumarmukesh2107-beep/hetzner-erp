
import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { Company } from '../../types';

const CompanyManagement: React.FC = () => {
  const { companies, addCompany, updateCompany } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Company, 'id'>>({
    name: '',
    gstNo: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    status: 'ACTIVE'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateCompany(editingId, formData);
    } else {
      addCompany(formData);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', gstNo: '', address: '', city: '', state: '', phone: '', email: '', status: 'ACTIVE' });
  };

  const handleEdit = (comp: Company) => {
    setEditingId(comp.id);
    setFormData(comp);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Company Master</h1>
          <p className="text-sm text-slate-500 font-medium">Manage legal business entities and registration details.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="px-6 py-2.5 bg-indigo-600 text-white text-[11px] font-black uppercase rounded-xl shadow-lg hover:bg-indigo-700 transition-all tracking-widest"
        >
          Add New Entity
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {companies.map(comp => (
          <div key={comp.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 group">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${comp.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400 opacity-50'}`}>
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight truncate">{comp.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${comp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {comp.status}
                  </span>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GSTIN</p>
                    <p className="text-xs font-bold text-slate-700">{comp.gstNo}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City</p>
                    <p className="text-xs font-bold text-slate-700">{comp.city}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{comp.address}</p>
                  </div>
               </div>
            </div>
            <div className="flex gap-2 shrink-0">
               <button onClick={() => handleEdit(comp)} className="px-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-400 transition-all">Edit Details</button>
               <button 
                 onClick={() => updateCompany(comp.id, { status: comp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                 className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${comp.status === 'ACTIVE' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
               >
                 {comp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
               </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Edit Company' : 'New Company Master'}</h2>
                 <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Trade Name</label>
                       <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Number</label>
                       <input required type="text" value={formData.gstNo} onChange={e => setFormData({...formData, gstNo: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 uppercase" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email (Official)</label>
                       <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600" />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Address</label>
                       <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600" />
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">City</label><input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">State</label><input required type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" /></div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs">Save Entity Record</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
