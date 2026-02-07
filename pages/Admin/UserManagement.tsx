
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { User, UserRole } from '../../types';

const UserManagement: React.FC = () => {
  const { users, addUser, updateUser } = useAuth();
  const { companies } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    mobile: '',
    role: UserRole.STAFF,
    status: 'ACTIVE',
    allowedCompanies: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateUser(editingId, formData);
    } else {
      addUser(formData);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', email: '', mobile: '', role: UserRole.STAFF, status: 'ACTIVE', allowedCompanies: [] });
  };

  const toggleCompany = (compId: string) => {
    setFormData(prev => {
      const current = prev.allowedCompanies;
      if (current.includes(compId)) {
        return { ...prev, allowedCompanies: current.filter(id => id !== compId) };
      }
      return { ...prev, allowedCompanies: [...current, compId] };
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">User Access Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Provision staff accounts and assign organizational permissions.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="px-6 py-2.5 bg-indigo-600 text-white text-[11px] font-black uppercase rounded-xl shadow-lg hover:bg-indigo-700 transition-all tracking-widest"
        >
          Provision New User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                 <th className="px-8 py-5">Personnel Info</th>
                 <th className="px-8 py-5">System Role</th>
                 <th className="px-8 py-5">Assigned Entities</th>
                 <th className="px-8 py-5 text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                         <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full border border-slate-100" />
                         <div>
                            <p className="font-black text-slate-800 uppercase tracking-tight">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</p>
                         </div>
                         <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                           {u.status}
                         </span>
                      </div>
                   </td>
                   <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        u.role === UserRole.ADMIN ? 'bg-slate-900 text-white border-slate-900' :
                        u.role === UserRole.MANAGER ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                         {u.role}
                      </span>
                   </td>
                   <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1">
                         {u.allowedCompanies.length === 0 ? (
                           <span className="text-xs text-rose-400 italic font-bold tracking-tight">Zero Assignments</span>
                         ) : (
                           u.allowedCompanies.map(cid => {
                             const cname = companies.find(c => c.id === cid)?.name || 'Unknown';
                             return <span key={cid} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded tracking-tighter">{cname}</span>;
                           })
                         )}
                      </div>
                   </td>
                   <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingId(u.id); setFormData(u); setShowForm(true); }}
                          className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[9px] font-black uppercase rounded-lg border border-slate-100 hover:bg-white hover:border-indigo-400"
                        >
                          Manage
                        </button>
                        <button 
                          onClick={() => updateUser(u.id, { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg ${u.status === 'ACTIVE' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        >
                          {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Edit Access Control' : 'Account Provisioning'}</h2>
                 <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 flex-1 overflow-y-auto space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6 border-r border-slate-100 pr-6">
                       <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Profile & Security</h3>
                       <div className="grid grid-cols-1 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Display Name</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email / Username</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Mobile</label><input required type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" /></div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Permission Tier</label>
                             <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-4 py-2.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-[11px] uppercase outline-none text-indigo-600">
                                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                             </select>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Organizational Scope</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Assign business entities this user can access:</p>
                       <div className="grid grid-cols-1 gap-3">
                          {companies.filter(c => c.status === 'ACTIVE').map(comp => (
                            <button 
                              key={comp.id}
                              type="button"
                              onClick={() => toggleCompany(comp.id)}
                              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${formData.allowedCompanies.includes(comp.id) ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50'}`}
                            >
                               <div>
                                  <p className={`text-xs font-black uppercase ${formData.allowedCompanies.includes(comp.id) ? 'text-indigo-700' : 'text-slate-600'}`}>{comp.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{comp.city}</p>
                               </div>
                               {formData.allowedCompanies.includes(comp.id) && (
                                 <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm">
                                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                 </div>
                               )}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="pt-6 border-t border-slate-100">
                   <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs">Save Access Profile</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
