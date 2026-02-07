
import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { PrintSettings } from '../types';

const SettingsPage: React.FC = () => {
  const { templates, updateTemplate } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'printing' | 'notifications'>('printing');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const currentTemplate = templates.find(t => t.id === editingTemplateId);

  const handleUpdateSetting = (key: keyof PrintSettings, value: any) => {
    if (!editingTemplateId) return;
    updateTemplate(editingTemplateId, { [key]: value });
  };

  const handleUpdateSignature = (pos: 'left' | 'right', value: string) => {
    if (!currentTemplate) return;
    updateTemplate(currentTemplate.id, {
      signatureLabels: { ...currentTemplate.settings.signatureLabels, [pos]: value }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">System Settings</h1>
          <p className="text-sm text-slate-500 font-medium">Configure global defaults and document styling.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-200 p-1 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('general')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>General</button>
        <button onClick={() => setActiveTab('printing')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'printing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Printing Templates</button>
        <button onClick={() => setActiveTab('notifications')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Notifications</button>
      </div>

      {activeTab === 'printing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Available Templates</h3>
            <div className="space-y-4">
              {templates.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setEditingTemplateId(t.id)}
                  className={`w-full text-left p-6 rounded-3xl border transition-all ${editingTemplateId === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 shadow-sm'}`}
                >
                  <p className="font-black text-xs uppercase tracking-tight mb-1">{t.name}</p>
                  <p className={`text-[10px] ${editingTemplateId === t.id ? 'text-indigo-100' : 'text-slate-400'}`}>{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {currentTemplate ? (
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
                <div className="px-8 py-6 border-b bg-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Customize: {currentTemplate.name}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time styling engine</p>
                  </div>
                  <button onClick={() => setEditingTemplateId(null)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Layout Components</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={currentTemplate.settings.showHeaderLogo} onChange={e => handleUpdateSetting('showHeaderLogo', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                          <span className="text-xs font-black text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">Show Header Logo</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={currentTemplate.settings.showBankDetails} onChange={e => handleUpdateSetting('showBankDetails', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                          <span className="text-xs font-black text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">Include Bank Details</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={currentTemplate.settings.showTerms} onChange={e => handleUpdateSetting('showTerms', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                          <span className="text-xs font-black text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">Show Standard Terms</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={currentTemplate.settings.showSignatures} onChange={e => handleUpdateSetting('showSignatures', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                          <span className="text-xs font-black text-slate-600 uppercase group-hover:text-indigo-600 transition-colors">Signatures Section</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Visual Styling</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Brand Theme Color</label>
                          <div className="flex gap-2">
                             <input type="color" value={currentTemplate.settings.primaryColor} onChange={e => handleUpdateSetting('primaryColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                             <input type="text" value={currentTemplate.settings.primaryColor} onChange={e => handleUpdateSetting('primaryColor', e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Header Alignment</label>
                          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                             {(['left', 'center', 'right'] as const).map(align => (
                               <button key={align} onClick={() => handleUpdateSetting('headerAlignment', align)} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${currentTemplate.settings.headerAlignment === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{align}</button>
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Text Content Overrides</h4>
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Left Signature Label</label>
                          <input type="text" value={currentTemplate.settings.signatureLabels.left} onChange={e => handleUpdateSignature('left', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                       </div>
                       <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Right Signature Label</label>
                          <input type="text" value={currentTemplate.settings.signatureLabels.right} onChange={e => handleUpdateSignature('right', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                       </div>
                       <div className="col-span-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Footer Acknowledgement Notes</label>
                          <textarea value={currentTemplate.settings.footerNotes} onChange={e => handleUpdateSetting('footerNotes', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold h-24 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                       </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">All changes are saved automatically to the system cache.</p>
                    <button onClick={() => setEditingTemplateId(null)} className="px-8 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all">Close Editor</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-6">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Select Template to Customize</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-xs font-medium">Modify header layouts, colors, and signature sections for your official documents.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">General Application Settings Module is coming soon.</p>
        </div>
      )}
      
      {activeTab === 'notifications' && (
        <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Notification preferences and webhooks are under development.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
