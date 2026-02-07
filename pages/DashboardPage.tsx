
import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSales } from '../context/SalesContext';
import { useAccounting } from '../context/AccountingContext';
import { SalesStatus } from '../types';

const DashboardPage: React.FC = () => {
  const { products, getTotalStock } = useInventory();
  const { sales } = useSales();
  const { getPLStatement } = useAccounting();

  // Inventory Summary
  const inventoryStats = useMemo(() => {
    let totalUnits = 0;
    let totalCostValue = 0;
    products.forEach(p => {
      const qty = getTotalStock(p.id);
      totalUnits += qty;
      totalCostValue += (qty * p.cost);
    });
    return { totalUnits, totalCostValue };
  }, [products, getTotalStock]);

  // Sales Summary (MTD)
  const salesStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const mtdSales = sales.filter(s => {
      if (s.status === SalesStatus.CANCELLED) return false;
      const bDate = new Date(s.bookingDate);
      return bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
    });

    const revenue = mtdSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const count = mtdSales.length;

    return { revenue, count };
  }, [sales]);

  // Financial Summary
  const pl = useMemo(() => getPLStatement(), [getPLStatement]);

  return (
    <div className="space-y-6 md:space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="px-1 md:px-0">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Executive Command Center</h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Cross-module performance auditing and real-time enterprise health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI: Sales Revenue MTD */}
        <div className="p-5 md:p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Revenue (MTD)</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">₹{salesStats.revenue.toLocaleString()}</h3>
          <p className="text-[9px] text-indigo-500 font-bold uppercase mt-2">{salesStats.count} Documents Generated</p>
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
        </div>

        {/* KPI: Inventory Holding Cost */}
        <div className="p-5 md:p-6 bg-slate-900 rounded-3xl shadow-xl text-white relative overflow-hidden group">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Stock Value</p>
          <h3 className="text-2xl md:text-3xl font-black tracking-tighter">₹{inventoryStats.totalCostValue.toLocaleString()}</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">{inventoryStats.totalUnits.toLocaleString()} Units In Storage</p>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
        </div>

        {/* KPI: Net Profitability */}
        <div className="p-5 md:p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Position</p>
          <h3 className={`text-2xl md:text-3xl font-black tracking-tighter ${pl.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{pl.netIncome.toLocaleString()}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Verified Realized Income</p>
        </div>

        {/* KPI: Efficiency */}
        <div className="p-5 md:p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operational Health</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Good</h3>
          <p className="text-[9px] text-emerald-500 font-bold uppercase mt-2">All modules synchronized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Module Status Center */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 md:px-8 py-4 md:py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Enterprise Stream</h3>
            <span className="text-[8px] md:text-[9px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-tighter">Live Status</span>
          </div>
          <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">System Operational</h4>
            <p className="text-xs md:text-sm text-slate-500 max-w-md mt-2">Detailed inventory reports have been migrated to the <strong>Inventory > Reports</strong> tab. Use the sidebar to navigate to specific modules.</p>
          </div>
        </div>

        {/* Quick Links / Highlights */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-indigo-600 p-6 md:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-3 md:mb-4">Valuation</h4>
             <p className="text-xs md:text-sm leading-relaxed mb-5 md:mb-6 opacity-80">Access the full valuation matrix and stock distribution charts directly.</p>
             <button onClick={() => window.location.hash = '#/inventory'} className="px-5 md:px-6 py-2 bg-white text-indigo-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-lg">Open Reports</button>
             <div className="absolute -bottom-10 -right-10 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3 md:gap-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU Overview</h4>
             <div className="flex justify-between items-end">
                <span className="text-2xl md:text-3xl font-black text-slate-800">{products.length}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase pb-1">Unique Product Codes</span>
             </div>
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
