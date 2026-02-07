
import React from 'react';
import { Company, Contact } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface ContactProfileDocumentProps {
  company: Company | null;
  contact: Contact;
  balance: number;
  ledger: any[];
}

const ContactProfileDocument: React.FC<ContactProfileDocumentProps> = ({ company, contact, balance, ledger }) => {
  const { getTemplate } = useSettings();
  const template = getTemplate('std-doc');
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-contact-profile" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      <div className="border-b-2 border-slate-900 pb-6 mb-12 flex justify-between items-end">
        <div className="flex gap-4 items-center">
          {settings.showHeaderLogo && (
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center text-3xl font-black rounded-xl shrink-0" style={{ backgroundColor: settings.primaryColor }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase" style={{ color: settings.accentColor }}>{company.name}</h1>
            <p className="text-[10px] font-bold uppercase text-slate-500">{company.address}, {company.city}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase text-indigo-600">Contact Profile</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {contact.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-6">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Name</p>
              <p className="text-xl font-black uppercase">{contact.name}</p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile / Email</p>
              <p className="text-sm font-bold">{contact.mobile} • {contact.email || 'N/A'}</p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Categories</p>
              <div className="flex flex-wrap gap-2 mt-1">
                 {contact.contactTypes.map(t => (
                   <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase">{t}</span>
                 ))}
              </div>
           </div>
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-3xl flex flex-col justify-center items-center shadow-xl">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Net Ledger Balance</p>
           <p className="text-4xl font-black">₹{Math.abs(balance).toLocaleString()}</p>
           <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{balance > 0 ? 'OUTSTANDING (DEBIT)' : balance < 0 ? 'ADVANCE (CREDIT)' : 'SETTLED'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
         <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing Address</p>
            <p className="text-xs font-bold leading-relaxed">{contact.billingAddress}</p>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{contact.city}, {contact.state}</p>
         </div>
         <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Details</p>
            <p className="text-xs font-bold">GSTIN: <span className="font-black text-indigo-600">{contact.gstNo || 'UNREGISTERED'}</span></p>
         </div>
      </div>

      <div className="mt-12">
         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 mb-4">Recent Transaction Snapshot</h3>
         <table className="w-full text-[10px] border-collapse">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b">
               <tr>
                  <th className="py-3 text-left">Date</th>
                  <th className="py-3 text-left">Reference</th>
                  <th className="py-3 text-right">Debit</th>
                  <th className="py-3 text-right">Credit</th>
                  <th className="py-3 text-right">Balance</th>
               </tr>
            </thead>
            <tbody>
               {ledger.slice(0, 15).map((entry, idx) => (
                 <tr key={idx} className="border-b border-slate-50">
                    <td className="py-3 font-bold text-slate-500">{entry.date}</td>
                    <td className="py-3 uppercase font-bold text-slate-800">{entry.reference}</td>
                    <td className="py-3 text-right font-black text-rose-500">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}</td>
                    <td className="py-3 text-right font-black text-emerald-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}</td>
                    <td className="py-3 text-right font-black">₹{entry.runningBalance.toLocaleString()}</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

      <div className="mt-20 border-t border-slate-100 pt-6 text-center">
         <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">End of Contact Profile Report</p>
      </div>
    </div>
  );
};

export default ContactProfileDocument;
