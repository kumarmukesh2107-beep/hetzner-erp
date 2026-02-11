
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { logout, user } = useAuth();
  const { activeCompany, companies, selectCompany } = useCompany();
  const [showSwitch, setShowSwitch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const allowedCompanies = companies.filter(c => user?.allowedCompanies.includes(c.id));

  return (
    <header className="flex items-center justify-between h-16 px-3 sm:px-4 md:px-6 bg-white border-b border-slate-200 shadow-sm relative z-50 gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-500 rounded-md lg:hidden hover:bg-slate-100"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => { setShowSwitch(!showSwitch); setShowUserMenu(false); }}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all group min-w-0 max-w-[56vw] sm:max-w-none"
          >
            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">
              {activeCompany?.name.charAt(0)}
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none truncate">{activeCompany?.name}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{activeCompany?.gstNo}</p>
            </div>
            <svg className={`w-3 h-3 text-slate-300 transition-transform ${showSwitch ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showSwitch && (
            <div className="absolute top-full left-0 mt-2 w-[88vw] max-w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Switch Company</p>
                 {user?.role === UserRole.ADMIN && (
                    <button onClick={() => { navigate('/admin/companies'); setShowSwitch(false); }} className="text-[8px] font-black text-indigo-600 uppercase hover:underline">Manage All Entities</button>
                 )}
              </div>
              <div className="p-1 max-h-[300px] overflow-y-auto">
                {allowedCompanies.map(c => (
                  <button
                    key={c.id}
                    disabled={c.id === activeCompany?.id}
                    onClick={() => { selectCompany(c.id); setShowSwitch(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${c.id === activeCompany?.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${c.id === activeCompany?.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-black uppercase truncate ${c.id === activeCompany?.id ? 'text-indigo-600' : 'text-slate-700'}`}>{c.name}</p>
                      <p className="text-[9px] font-bold text-slate-400">{c.city}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        <div className="hidden md:flex flex-col items-end mr-2">
           <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{user?.name}</p>
           <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{user?.role}</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => { setShowUserMenu(!showUserMenu); setShowSwitch(false); }}
            className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden hover:border-indigo-300 transition-all focus:ring-2 focus:ring-indigo-100"
          >
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
               <div className="p-5 border-b border-slate-100">
                  <p className="font-black text-slate-800 text-sm uppercase">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.email}</p>
               </div>
               <div className="p-1 space-y-0.5">
                  {user?.role === UserRole.ADMIN && (
                    <>
                       <button onClick={() => { navigate('/admin/users'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          User Access Center
                       </button>
                       <button onClick={() => { navigate('/admin/companies'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          Company Master
                       </button>
                    </>
                  )}
                  <div className="border-t border-slate-100 my-1" />
                  <button 
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout System
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
