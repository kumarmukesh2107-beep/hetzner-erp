
import React, { useMemo, useState, useCallback } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useContacts } from '../context/ContactContext';
import { useInventory } from '../context/InventoryContext';
import { useSettings } from '../context/SettingsContext';
import { useSales } from '../context/SalesContext';
import { ContactType, TransactionType, LedgerEntry, SalesStatus } from '../types';
import { formatDisplayDate } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

const ReportsPage: React.FC = () => {
  const { ledger, accounts } = useAccounting();
  const { sales } = useSales();
  const { products } = useInventory();
  
  const [activeReport, setActiveReport] = useState<'pl' | 'bs' | 'ageing' | 'brand_profitability'>('pl');
  const [dataSource, setDataSource] = useState<'live' | 'historical' | 'combined'>('live');
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  
  const [filterStore, setFilterStore] = useState('All');
  const [filterTeam, setFilterTeam] = useState('All');

  const filterBySource = useCallback((entry: any) => {
    const isHist = !!entry.isHistorical;
    if (dataSource === 'combined') return true;
    if (dataSource === 'live') return !isHist;
    if (dataSource === 'historical') return isHist;
    return true;
  }, [dataSource]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!filterBySource(s)) return false;
      if (dateFilter.start && s.bookingDate < dateFilter.start) return false;
      if (dateFilter.end && s.bookingDate > dateFilter.end) return false;
      if (filterStore !== 'All' && s.storeName !== filterStore) return false;
      if (filterTeam !== 'All' && s.salesTeam !== filterTeam) return false;
      return true;
    });
  }, [sales, filterBySource, dateFilter, filterStore, filterTeam]);

  const pl = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const discounts = filteredSales.reduce((sum, s) => sum + (s.totalDiscount || 0), 0);
    const incentives = filteredSales.reduce((sum, s) => sum + (s.architectIncentive || 0), 0);
    const fittings = filteredSales.reduce((sum, s) => sum + (s.fittingCharges || 0), 0);
    
    // Cost estimation for historical or combined
    const estimatedCost = filteredSales.reduce((sum, s) => {
       return sum + s.items.reduce((iSum, item) => {
          const p = products.find(prod => prod.id === item.productId);
          return iSum + ((p?.cost || 0) * item.orderedQty);
       }, 0);
    }, 0);

    const netIncome = revenue - estimatedCost - incentives - fittings;
    
    return { revenue, estimatedCost, incentives, fittings, netIncome, discounts };
  }, [filteredSales, products]);

  const brandStats = useMemo(() => {
    const brandsMap = new Map<string, { rev: number, cost: number }>();
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const p = products.find(prod => prod.id === it.productId);
        const b = p?.brand || 'OTHER';
        const cost = (p?.cost || 0) * it.orderedQty;
        const current = brandsMap.get(b) || { rev: 0, cost: 0 };
        brandsMap.set(b, { rev: current.rev + it.total, cost: current.cost + cost });
      });
    });
    return Array.from(brandsMap.entries()).map(([name, data]) => ({
      brand: name,
      revenue: data.rev,
      cost: data.cost,
      gp: data.rev - data.cost,
      margin: data.rev > 0 ? ((data.rev - data.cost) / data.rev) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  const stores = useMemo(() => ['All', ...new Set(sales.map(s => s.storeName).filter(Boolean))], [sales]);
  const teams = useMemo(() => ['All', ...new Set(sales.map(s => s.salesTeam).filter(Boolean))], [sales]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Intelligence Analytics</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-2">Enterprise Multi-Source Auditing Center</p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
           <div className="flex bg-slate-900 p-1 rounded-2xl shadow-xl">
              {(['live', 'historical', 'combined'] as const).map(source => (
                 <button 
                  key={source} 
                  onClick={() => setDataSource(source)}
                  className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${dataSource === source ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-400'}`}
                 >
                    {source}
                 </button>
              ))}
           </div>
           <div className="flex bg-slate-200 p-1 rounded-2xl overflow-x-auto">
              <button onClick={() => setActiveReport('pl')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${activeReport === 'pl' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>P & L</button>
              <button onClick={() => setActiveReport('brand_profitability')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${activeReport === 'brand_profitability' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Margins</button>
              <button onClick={() => setActiveReport('ageing')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${activeReport === 'ageing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Ageing</button>
           </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
         <div className="flex gap-4">
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Start</label>
               <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date End</label>
               <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
            </div>
         </div>
         <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Store / Branch</label>
            <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-black uppercase">
               {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Team</label>
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-black uppercase">
               {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
         </div>
      </div>

      {activeReport === 'pl' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div>
                    <h3 className="text-indigo-400 font-black uppercase text-[11px] tracking-widest mb-2">Net Period Yield ({dataSource.toUpperCase()})</h3>
                    <p className={`text-6xl font-black tracking-tighter ${pl.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{Math.round(pl.netIncome).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-4 leading-relaxed font-medium">Verified audit summary for <strong>{filteredSales.length}</strong> transactions in selected period.</p>
                    {dataSource === 'historical' && <span className="inline-block mt-4 px-4 py-1.5 bg-indigo-600/30 text-indigo-300 rounded-full text-[9px] font-black uppercase border border-indigo-500/50">MIGRATED ARCHIVE DATA SOURCE</span>}
                 </div>
                 <div className="grid grid-cols-1 gap-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Gross Sales</span>
                       <span className="text-xl font-black text-white">+₹{Math.round(pl.revenue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Est. Direct Costs</span>
                       <span className="text-xl font-black text-rose-400">-₹{Math.round(pl.estimatedCost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Discounts & Incentives</span>
                       <span className="text-xl font-black text-rose-400">-₹{Math.round(pl.discounts + pl.incentives).toLocaleString()}</span>
                    </div>
                 </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
           </div>
        </div>
      )}

      {activeReport === 'brand_profitability' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Brand Performance Portfolio ({dataSource.toUpperCase()})</h3>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       <tr><th className="px-8 py-4">Brand</th><th className="px-8 py-4 text-right">Revenue</th><th className="px-8 py-4 text-right">Est. Cost</th><th className="px-8 py-4 text-right">Gross Profit</th><th className="px-8 py-4">Margin %</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {brandStats.map(b => (
                         <tr key={b.brand} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">{b.brand}</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-600">₹{Math.round(b.revenue).toLocaleString()}</td>
                            <td className="px-8 py-5 text-right font-medium text-slate-400">₹{Math.round(b.cost).toLocaleString()}</td>
                            <td className="px-8 py-5 text-right font-black text-emerald-600">₹{Math.round(b.gp).toLocaleString()}</td>
                            <td className="px-8 py-5 font-black text-indigo-600">{b.margin.toFixed(1)}%</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
