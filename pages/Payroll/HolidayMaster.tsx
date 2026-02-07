
import React, { useState } from 'react';
import { usePayroll } from '../../context/PayrollContext';

const HolidayMaster: React.FC = () => {
  const { holidays, addHoliday, deleteHoliday } = usePayroll();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ date: '', name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addHoliday(formData);
    setShowForm(false);
    setFormData({ date: '', name: '' });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Public Holidays</h3>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">Add Holiday</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holidays.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 italic">No holidays configured.</div>
        ) : (
          holidays.map(h => (
            <div key={h.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{h.name}</p>
              </div>
              <button onClick={() => deleteHoliday(h.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Add Holiday</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Holiday Date</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Event Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Diwali" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Add to Master</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayMaster;
