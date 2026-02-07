
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const CompanySelectionPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { companies, selectCompany } = useCompany();

  // ONLY allow companies that are both ACTIVE and assigned to the USER
  const allowedCompanies = companies.filter(c => 
    c.status === 'ACTIVE' && user?.allowedCompanies.includes(c.id)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Select Business Entity</h1>
          <p className="text-slate-500 mt-2 font-medium">Welcome back, {user?.name}. Please choose a company to proceed.</p>
        </div>

        {allowedCompanies.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border border-slate-200 shadow-xl text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Access Restricted</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">You have no active company assignments. Please contact your system administrator.</p>
            <button onClick={logout} className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl">Logout</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {allowedCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => selectCompany(company.id)}
                className="bg-white p-8 rounded-[32px] border-2 border-slate-100 hover:border-indigo-600 shadow-xl shadow-slate-200/50 text-left transition-all hover:scale-[1.02] group"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">GSTIN: {company.gstNo}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{company.address}, {company.city}</p>
                </div>
                <div className="mt-8 flex items-center text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                  Access Workspace
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <button onClick={logout} className="text-slate-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-colors">Sign out from NexusERP</button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelectionPage;
