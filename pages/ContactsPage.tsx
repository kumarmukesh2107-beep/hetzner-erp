
import React, { useState, useMemo, useRef } from 'react';
import { useContacts } from '../context/ContactContext';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { Contact, ContactType, ContactCategory, CONTACT_CATEGORIES, UserRole } from '../types';
import * as XLSX from 'xlsx';

const CategoryBadge: React.FC<{ category: ContactCategory }> = ({ category }) => {
  const config: Record<ContactCategory, string> = {
    'Customer': 'bg-indigo-50 text-indigo-700',
    'Supplier': 'bg-rose-50 text-rose-700',
    'Architect': 'bg-emerald-50 text-emerald-700',
    'Employee': 'bg-amber-50 text-amber-700',
    'Contractor': 'bg-blue-50 text-blue-700',
    'Transporter': 'bg-slate-100 text-slate-600',
    'Other': 'bg-slate-50 text-slate-500'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${config[category]}`}>
      {category}
    </span>
  );
};

interface ValidatedRow {
  data: any;
  status: 'NEW' | 'UPDATE' | 'ERROR';
  reason?: string;
}

const ContactsPage: React.FC = () => {
  const { contacts, addContact, updateContact, getContactBalance, bulkImportContacts } = useContacts();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Import Wizard State
  const [importMode, setImportMode] = useState<'add_only' | 'add_update'>('add_only');
  const [previewRows, setPreviewRows] = useState<ValidatedRow[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageData = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'createdAt' | 'companyId'>>({
    name: '',
    type: ContactType.CUSTOMER,
    contactTypes: ['Customer'],
    mobile: '',
    email: '',
    billingAddress: '',
    city: '',
    state: '',
    openingBalance: 0,
    gstNo: '',
    status: 'Active',
    shippingAddress: ''
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesCategory = filterCategory === 'ALL' || c.contactTypes.includes(filterCategory);
      const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile.includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [contacts, filterCategory, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryType = formData.contactTypes.includes('Supplier') ? ContactType.SUPPLIER : ContactType.CUSTOMER;
    const finalData = { ...formData, type: primaryType };
    if (editingContact) updateContact(editingContact.id, finalData);
    else addContact(finalData);
    setShowForm(false);
    setEditingContact(null);
  };

  // --- Import/Export Logic ---
  const handleExportTemplate = () => {
    const template = [
      {
        'name*': 'John Doe',
        'mobile*': '9999900000',
        'email': 'john@example.com',
        'contact_type*': 'Customer, Architect',
        'address': 'Flat 101, Galaxy Apts',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'gst_no': '27ABCDE1234F1Z5',
        'status': 'Active',
        'opening_balance': 0
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contact_Template");
    XLSX.writeFile(wb, "Nexus_Contact_Template.xlsx");
  };

  const handleExportData = () => {
    const data = filteredContacts.map(c => ({
      name: c.name,
      mobile: c.mobile,
      email: c.email || '',
      contact_type: c.contactTypes.join(', '),
      address: c.billingAddress,
      city: c.city,
      state: c.state,
      gst_no: c.gstNo || '',
      status: c.status || 'Active',
      opening_balance: c.openingBalance
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, `Nexus_Contacts_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        // Analyze before showing preview
        const validated: ValidatedRow[] = rawData.map((row: any) => {
          const name = String(row['name*'] || row['name'] || row['Name'] || '').trim();
          const mobile = String(row['mobile*'] || row['mobile'] || row['Mobile'] || '').trim().replace(/[^\d]/g, '');
          const typeStr = String(row['contact_type*'] || row['contact_type'] || row['Contact Types'] || '');
          
          if (!name || !mobile || mobile.length < 10 || !typeStr) {
            return { data: row, status: 'ERROR', reason: 'Missing mandatory fields (Name, Mobile (10 digits), or Type)' };
          }

          const existing = contacts.find(c => c.mobile === mobile);
          if (existing) {
            if (importMode === 'add_only') {
              return { data: row, status: 'ERROR', reason: 'Duplicate mobile number (Add Only mode)' };
            }
            return { data: row, status: 'UPDATE' };
          }
          return { data: row, status: 'NEW' };
        });

        setPreviewRows(validated);
      } catch (err) {
        alert("Failed to parse file. Ensure it is a valid Excel/CSV.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    if (!previewRows) return;
    const rawToImport = previewRows.filter(r => r.status !== 'ERROR').map(r => r.data);
    if (rawToImport.length === 0) return alert("No valid rows to import.");
    
    setIsProcessing(true);
    const res = bulkImportContacts(rawToImport, importMode);
    alert(`Import Summary: ${res.success} Added, ${res.updated} Updated, ${res.failed} Failed.`);
    setPreviewRows(null);
    setIsProcessing(false);
    setActiveTab('list');
  };

  return (
    <div className="space-y-6 px-1 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Unified Contacts</h1>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Enterprise Directory Hub</p>
        </div>
        
        <div className="flex p-1 bg-slate-200 rounded-xl tabs-row overflow-x-auto scrollbar-hide shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Database List
          </button>
          {canManageData && (
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'import' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Import Wizard
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[24px] border border-slate-200 shadow-sm flex flex-col md:flex-row flex-wrap items-stretch md:items-end gap-3 md:gap-4 no-print">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Search Directory</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name / Mobile..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Type Filter</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                <option value="ALL">All Categories</option>
                {CONTACT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handleExportData} className="p-2.5 bg-white border border-slate-200 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-sm" title="Export to Excel">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
              </button>
              <button onClick={() => { setEditingContact(null); setShowForm(true); }} className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg text-[9px] md:text-[10px] uppercase tracking-widest transition-all">Register New</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]">
                 <thead className="bg-slate-50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr>
                      <th className="px-6 md:px-8 py-4 text-left">Identity</th>
                      <th className="px-6 md:px-8 py-4">Roles</th>
                      <th className="px-6 md:px-8 py-4">Locality</th>
                      <th className="px-6 md:px-8 py-4 text-right">Net Balance</th>
                      <th className="px-6 md:px-8 py-4 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredContacts.map(c => {
                      const balance = getContactBalance(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 md:px-8 py-5">
                             <p className="font-black text-slate-800 uppercase text-xs truncate max-w-[150px]">{c.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">{c.mobile}</p>
                          </td>
                          <td className="px-6 md:px-8 py-5">
                             <div className="flex flex-wrap gap-1">
                                {c.contactTypes.slice(0, 2).map(t => <CategoryBadge key={t} category={t} />)}
                                {c.contactTypes.length > 2 && <span className="text-[8px] text-slate-400">+{c.contactTypes.length-2}</span>}
                             </div>
                          </td>
                          <td className="px-6 md:px-8 py-5">
                             <p className="text-[10px] font-black text-slate-500 uppercase">{c.city || '-'}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase">{c.state || ''}</p>
                          </td>
                          <td className="px-6 md:px-8 py-5 text-right">
                             <p className={`font-black text-[11px] md:text-xs ${balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                ₹{Math.abs(balance).toLocaleString()} {balance > 0 ? 'DR' : balance < 0 ? 'CR' : ''}
                             </p>
                          </td>
                          <td className="px-6 md:px-8 py-5 text-right">
                             <button onClick={() => { setEditingContact(c); setFormData(c as any); setShowForm(true); }} className="text-indigo-600 font-black text-[9px] md:text-[10px] uppercase hover:underline">Modify</button>
                          </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          {!previewRows ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Step 1: Document Preparation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Download our standardized Excel template. Populate the columns and ensure that the **Mobile Number** and **Name** fields are accurate. Comma-separate multiple categories.
                </p>
                <button 
                  onClick={handleExportTemplate}
                  className="w-full py-4 bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Get Template Document
                </button>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Step 2: Engine Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Operation Mode</label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                      <button 
                        onClick={() => setImportMode('add_only')}
                        className={`py-2 text-[9px] font-black uppercase rounded-xl transition-all ${importMode === 'add_only' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Create New Only
                      </button>
                      <button 
                        onClick={() => setImportMode('add_update')}
                        className={`py-2 text-[9px] font-black uppercase rounded-xl transition-all ${importMode === 'add_update' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Sync & Update
                      </button>
                    </div>
                  </div>
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" hidden />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    Upload and Analyze Data
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border border-indigo-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
               <div className="px-10 py-6 border-b border-indigo-50 bg-indigo-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-indigo-900 uppercase tracking-tight leading-none">Analysis Phase: {previewRows.length} Entries</h3>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-2">Mode: {importMode === 'add_only' ? 'NO UPDATES (RESTRICTED)' : 'FULL SYNC (OVERWRITE)'}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setPreviewRows(null)} className="px-6 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:text-slate-800 transition-colors bg-white border rounded-xl">Discard Batch</button>
                    <button 
                      onClick={executeImport} 
                      disabled={isProcessing}
                      className="px-10 py-2.5 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all"
                    >
                      {isProcessing ? 'Processing...' : 'Confirm & Commit All Changes'}
                    </button>
                  </div>
               </div>
               <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b sticky top-0 z-10">
                      <tr>
                        <th className="px-10 py-4">Proposed Action</th>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Mobile</th>
                        <th className="px-6 py-4">Mapped Types</th>
                        <th className="px-6 py-4">Audit Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {previewRows.map((row, i) => (
                        <tr key={i} className={`${row.status === 'ERROR' ? 'bg-rose-50/30' : 'hover:bg-indigo-50/30'} transition-colors`}>
                          <td className="px-10 py-3.5">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                               row.status === 'NEW' ? 'bg-emerald-100 text-emerald-700' : 
                               row.status === 'UPDATE' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                             }`}>
                               {row.status}
                             </span>
                          </td>
                          <td className="px-6 py-3.5 uppercase font-bold text-slate-800">{row.data['name*'] || row.data['name'] || '-'}</td>
                          <td className="px-6 py-3.5 font-mono text-indigo-600">{row.data['mobile*'] || row.data['mobile'] || '-'}</td>
                          <td className="px-6 py-3.5 text-slate-400 uppercase font-black text-[9px] truncate max-w-[150px]">{row.data['contact_type*'] || row.data['contact_type'] || '-'}</td>
                          <td className={`px-6 py-3.5 italic text-[10px] ${row.status === 'ERROR' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                             {row.status === 'NEW' ? 'Fresh Entry' : row.status === 'UPDATE' ? 'Existing Link' : row.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{editingContact ? 'Modify Profile' : 'Register Contact Entity'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Trade / Legal Name</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="block w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 uppercase text-xs" />
                </div>
                
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Unique Mobile No*</label><input required type="text" maxLength={10} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none text-xs" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">E-Mail Identity</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs" /></div>
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTACT_CATEGORIES.map(cat => {
                      const isSelected = formData.contactTypes.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? formData.contactTypes.filter(t => t !== cat) 
                              : [...formData.contactTypes, cat];
                            if (next.length > 0) setFormData({...formData, contactTypes: next});
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Primary Billing Address</label><input type="text" value={formData.billingAddress} onChange={e => setFormData({...formData, billingAddress: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs" /></div>
                
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">City</label><input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">State / Territory</label><input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs" /></div>
                
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">GSTIN Master</label><input type="text" value={formData.gstNo} onChange={e => setFormData({...formData, gstNo: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none text-xs" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Opening Ledger Balance (₹)</label><input type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none text-xs" /></div>
              </div>
              <div className="pt-6 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 text-[10px] font-black uppercase text-slate-600 bg-white border border-slate-200 rounded-2xl">Cancel</button>
                <button type="submit" className="px-10 py-3 text-[10px] font-black uppercase text-white bg-indigo-600 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">{editingContact ? 'Commit Changes' : 'Register Profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
