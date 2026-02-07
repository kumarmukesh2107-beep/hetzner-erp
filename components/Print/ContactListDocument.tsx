
import React from 'react';
import { Company, Contact } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface ContactListDocumentProps {
  company: Company | null;
  contacts: Contact[];
  getContactBalance: (id: string) => number;
}

const ContactListDocument: React.FC<ContactListDocumentProps> = ({ company, contacts, getContactBalance }) => {
  const { getTemplate } = useSettings();
  const template = getTemplate('std-doc');
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-contact-list" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
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
          <h2 className="text-2xl font-black uppercase text-indigo-600">Contacts Directory</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Printed: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <table className="w-full text-[10px] border-collapse border border-slate-200">
        <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
          <tr>
            <th className="p-3 text-left">Contact Name</th>
            <th className="p-3 text-left">Mobile</th>
            <th className="p-3 text-left">GSTIN</th>
            <th className="p-3 text-left">Categories</th>
            <th className="p-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(c => {
            const bal = getContactBalance(c.id);
            return (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-black uppercase">{c.name}</td>
                <td className="p-3 font-bold">{c.mobile}</td>
                <td className="p-3 font-mono">{c.gstNo || '-'}</td>
                <td className="p-3">
                  <span className="text-slate-500">{c.contactTypes.join(', ')}</span>
                </td>
                <td className={`p-3 text-right font-black ${bal > 0 ? 'text-rose-600' : bal < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  ₹{Math.abs(bal).toLocaleString()} {bal > 0 ? 'DR' : bal < 0 ? 'CR' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="mt-20 border-t border-slate-100 pt-6 text-center">
         <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Internal NexusERP Document</p>
      </div>
    </div>
  );
};

export default ContactListDocument;
