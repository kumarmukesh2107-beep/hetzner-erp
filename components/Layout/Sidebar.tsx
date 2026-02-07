
import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const filteredNavItems = NAV_ITEMS.filter(item => 
    user && item.roles.includes(user.role)
  );

  const mainItems = filteredNavItems.filter(item => !item.path.startsWith('/admin'));
  const adminItems = filteredNavItems.filter(item => item.path.startsWith('/admin'));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-center h-16 bg-slate-950">
          <span className="text-xl font-bold tracking-tight text-indigo-400">Nexus<span className="text-white">ERP</span></span>
        </div>

        <nav className="mt-5 px-4 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="space-y-1">
             {mainItems.map((item) => (
               <NavLink
                 key={item.name}
                 to={item.path}
                 onClick={onClose}
                 className={({ isActive }) => `
                   flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                   ${isActive 
                     ? 'bg-indigo-600 text-white' 
                     : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                 `}
               >
                 {item.icon}
                 <span className="ml-3">{item.name}</span>
               </NavLink>
             ))}
          </div>

          {adminItems.length > 0 && (
             <div className="space-y-1 border-t border-slate-800 pt-6 pb-12">
               <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">System Admin</p>
               {adminItems.map((item) => (
                 <NavLink
                   key={item.name}
                   to={item.path}
                   onClick={onClose}
                   className={({ isActive }) => `
                     flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                     ${isActive 
                       ? 'bg-indigo-600 text-white' 
                       : 'text-slate-500 hover:bg-slate-800 hover:text-white'}
                   `}
                 >
                   {item.icon}
                   <span className="ml-3">{item.name}</span>
                 </NavLink>
               ))}
             </div>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
