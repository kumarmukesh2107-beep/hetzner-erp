
import React, { useState, useMemo } from 'react';
import { useContacts } from '../context/ContactContext';
import { useSales } from '../context/SalesContext';
import { useInventory } from '../context/InventoryContext';
import { SalesStatus, SalesTransaction, WarehouseType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

const SalesReportsHub: React.FC = () => {
  const { sales } = useSales();
  const { products } = useInventory();
  const { contacts } = useContacts();
  
  const [reportTab, setReportTab] = useState<'analytics' | 'itemwise' | 'performance'>('analytics');
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [brandFilter, setBrandFilter] = useState('All Brands');

  const reportBrands = useMemo(() => ['All Brands', ...new Set(products.map(p => p.brand || 'Other'))].sort(), [products]);

  // Helper to determine Month/Year key from bookingDate
  const getMonthYear = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // 1. Data Filtering Logic (Using bookingDate)
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === SalesStatus.CANCELLED) return false;
      const bDate = new Date(s.bookingDate);
      if (dateFilter.start && bDate < new Date(dateFilter.start)) return false;
      if (dateFilter.end && bDate > new Date(dateFilter.end)) return false;
      return true;
    });
  }, [sales, dateFilter]);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const reportFilteredSales = useMemo(() => {
    if (brandFilter === 'All Brands') return filteredSales;
    return filteredSales.filter(s => s.items.some(item => (productById.get(item.productId)?.brand || 'Other') === brandFilter));
  }, [filteredSales, brandFilter, productById]);

  // 2. Comprehensive Analytics Calculations
  const analyticsData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Aggregators
    const brandMap = new Map<string, { revenue: number, qty: number }>();
    const spCustomRangeMap = new Map<string, { revenue: number, count: number }>();
    const spMTDMap = new Map<string, { revenue: number }>();
    const spLastMonthMap = new Map<string, { revenue: number, details: any[] }>();
    
    let totalConfirmedRevenue = 0;
    let totalConfirmedCost = 0;
    let totalConfirmedDiscount = 0;
    let totalConfirmedBaseValue = 0; // Price * Qty before discount/tax
    let confirmedCount = 0;

    // Full history iteration for MTD/Last Month comparison regardless of custom filter
    sales.forEach(s => {
      if (s.status === SalesStatus.CANCELLED) return;
      const isConfirmed = s.status !== SalesStatus.QUOTATION && s.status !== SalesStatus.QUOTATION_SENT;
      if (!isConfirmed) return;

      const bDate = new Date(s.bookingDate);
      const sMonth = bDate.getMonth();
      const sYear = bDate.getFullYear();
      const sp = s.salesPerson || 'Unassigned';

      // 1. MTD Calculation (Current Month)
      if (sMonth === currentMonth && sYear === currentYear) {
        const existing = spMTDMap.get(sp) || { revenue: 0 };
        spMTDMap.set(sp, { revenue: existing.revenue + s.grandTotal });
      }

      // 2. Last Month Calculation
      if (sMonth === lastMonth && sYear === lastMonthYear) {
        const existing = spLastMonthMap.get(sp) || { revenue: 0, details: [] };
        spLastMonthMap.set(sp, { 
          revenue: existing.revenue + s.grandTotal, 
          details: [...existing.details, { order: s.orderNo, value: s.grandTotal, date: s.bookingDate }] 
        });
      }
    });

    // Custom Range Calculations
    reportFilteredSales.forEach(s => {
      const isConfirmed = s.status !== SalesStatus.QUOTATION && s.status !== SalesStatus.QUOTATION_SENT;
      if (!isConfirmed) return;

      confirmedCount++;
      totalConfirmedRevenue += s.grandTotal;
      totalConfirmedDiscount += s.totalDiscount;
      
      const sp = s.salesPerson || 'Unassigned';
      const spExisting = spCustomRangeMap.get(sp) || { revenue: 0, count: 0 };
      spCustomRangeMap.set(sp, { revenue: spExisting.revenue + s.grandTotal, count: spExisting.count + 1 });

      s.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const brand = p?.brand || 'Other';
        const cost = p?.cost || 0;
        
        totalConfirmedCost += (cost * item.orderedQty);
        totalConfirmedBaseValue += (item.price * item.orderedQty);

        // Brand Stats
        const bExisting = brandMap.get(brand) || { revenue: 0, qty: 0 };
        brandMap.set(brand, { 
          revenue: bExisting.revenue + item.total, 
          qty: bExisting.qty + item.orderedQty 
        });
      });
    });

    // Conversion to arrays for display
    const brandStats = Array.from(brandMap.entries())
      .map(([name, val]) => ({ 
        name, 
        revenue: val.revenue, 
        qty: val.qty, 
        contribution: totalConfirmedRevenue > 0 ? (val.revenue / totalConfirmedRevenue) * 100 : 0 
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const spPerformance = Array.from(spCustomRangeMap.entries()).map(([name, val]) => ({
      name,
      revenue: val.revenue,
      orders: val.count,
      mtd: spMTDMap.get(name)?.revenue || 0,
      lastMonth: spLastMonthMap.get(name)?.revenue || 0
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      brandStats,
      spPerformance,
      metrics: {
        avgTicketSize: confirmedCount > 0 ? totalConfirmedRevenue / confirmedCount : 0,
        avgDiscountPercent: totalConfirmedBaseValue > 0 ? (totalConfirmedDiscount / totalConfirmedBaseValue) * 100 : 0,
        avgMarginPercent: totalConfirmedRevenue > 0 ? ((totalConfirmedRevenue - totalConfirmedCost) / totalConfirmedRevenue) * 100 : 0,
        totalConfirmedRevenue,
        confirmedCount
      },
      lastMonthLabel: new Date(lastMonthYear, lastMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [reportFilteredSales, sales, products]);

  // 3. Item-wise Ledger (Using bookingDate)
  const itemWiseRows = useMemo(() => {
    const rows: any[] = [];
    reportFilteredSales.forEach(s => {
      s.items.forEach(item => {
        rows.push({
          bookingDate: s.bookingDate,
          orderNo: s.orderNo,
          customer: s.customerName,
          salesPerson: s.salesPerson,
          status: s.status,
          product: item.productName,
          model: item.modelNo,
          qty: item.orderedQty,
          price: item.price,
          gst: item.gstRate,
          total: item.total
        });
      });
    });
    return rows.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
  }, [reportFilteredSales]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(itemWiseRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales_Ledger");
    XLSX.writeFile(workbook, `Sales_Detail_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const salesSummaryData = useMemo(() => {
    const confirmedSales = reportFilteredSales.filter(s => s.status !== SalesStatus.QUOTATION && s.status !== SalesStatus.QUOTATION_SENT);

    const productSummary = new Map<string, { product: string; brand: string; qty: number; value: number }>();
    const citySummary = new Map<string, { city: string; orders: number; value: number }>();
    const clientSummary = new Map<string, { client: string; orders: number; value: number }>();

    confirmedSales.forEach((sale) => {
      const contactCity = contacts.find(c => c.id === sale.contactId)?.city || 'Unknown';
      const cityEntry = citySummary.get(contactCity) || { city: contactCity, orders: 0, value: 0 };
      citySummary.set(contactCity, { city: contactCity, orders: cityEntry.orders + 1, value: cityEntry.value + sale.grandTotal });

      const clientEntry = clientSummary.get(sale.customerName) || { client: sale.customerName, orders: 0, value: 0 };
      clientSummary.set(sale.customerName, { client: sale.customerName, orders: clientEntry.orders + 1, value: clientEntry.value + sale.grandTotal });

      sale.items.forEach((item) => {
        const prod = productById.get(item.productId);
        const label = item.productName || prod?.name || 'Unknown Product';
        const key = `${label}__${item.modelNo || ''}`;
        const existing = productSummary.get(key) || { product: label, brand: prod?.brand || 'Other', qty: 0, value: 0 };
        productSummary.set(key, {
          product: label,
          brand: prod?.brand || existing.brand,
          qty: existing.qty + item.orderedQty,
          value: existing.value + item.total
        });
      });
    });

    return {
      topProductsByQty: Array.from(productSummary.values()).sort((a, b) => b.qty - a.qty).slice(0, 10),
      topProductsByValue: Array.from(productSummary.values()).sort((a, b) => b.value - a.value).slice(0, 10),
      topCities: Array.from(citySummary.values()).sort((a, b) => b.value - a.value).slice(0, 10),
      topClients: Array.from(clientSummary.values()).sort((a, b) => b.value - a.value).slice(0, 10)
    };
  }, [reportFilteredSales, productById, contacts]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Revenue Intelligence</h1>
          <p className="text-sm text-slate-500 font-medium">Performance auditing by Brand, Salesperson, and Efficiency Metrics.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {(['analytics', 'itemwise', 'performance'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setReportTab(tab)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${reportTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab === 'itemwise' ? 'Detailed Ledger' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Booking Start</span>
            <input 
              type="date" 
              value={dateFilter.start} 
              onChange={e => setDateFilter({...dateFilter, start: e.target.value})}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Booking End</span>
            <input 
              type="date" 
              value={dateFilter.end} 
              onChange={e => setDateFilter({...dateFilter, end: e.target.value})}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
        </div>
        <button 
          onClick={() => setDateFilter({ start: '', end: '' })}
          className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          Clear Period
        </button>
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Brand</span>
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {reportBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </div>
        <div className="ml-auto">
           <button onClick={exportToExcel} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
              Export Global Ledger
           </button>
        </div>
      </div>

      {reportTab === 'analytics' && (
        <div className="space-y-8">
          {/* Efficiency Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-slate-950 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Avg Ticket Size</p>
                <p className="text-3xl font-black">₹{Math.round(analyticsData.metrics.avgTicketSize).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">Revenue per Confirmed SO</p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-indigo-600/20 transition-all" />
             </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Discount Given</p>
                <p className="text-3xl font-black text-rose-600">{analyticsData.metrics.avgDiscountPercent.toFixed(1)}%</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">On Confirmed Gross Value</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Margin %</p>
                <p className="text-3xl font-black text-emerald-600">{analyticsData.metrics.avgMarginPercent.toFixed(1)}%</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Gross Profit Efficiency</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Range Confirmed</p>
                <p className="text-3xl font-black text-slate-900">₹{analyticsData.metrics.totalConfirmedRevenue.toLocaleString()}</p>
                <p className="text-[9px] text-indigo-500 font-bold uppercase mt-2">{analyticsData.metrics.confirmedCount} Verified Documents</p>
             </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b bg-slate-50"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Products by Qty</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="px-8 py-4">Product</th><th className="px-4 py-4">Brand</th><th className="px-8 py-4 text-right">Qty</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{salesSummaryData.topProductsByQty.map((row, i) => <tr key={`${row.product}-${i}`} className="hover:bg-slate-50"><td className="px-8 py-4 font-black text-slate-800 uppercase text-xs">{row.product}</td><td className="px-4 py-4 font-bold text-slate-500 uppercase text-xs">{row.brand}</td><td className="px-8 py-4 text-right font-black text-indigo-600">{row.qty}</td></tr>)}{salesSummaryData.topProductsByQty.length === 0 && <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-black uppercase text-xs">No confirmed sales.</td></tr>}</tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b bg-slate-50"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Products by Value</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="px-8 py-4">Product</th><th className="px-4 py-4">Brand</th><th className="px-8 py-4 text-right">Value</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{salesSummaryData.topProductsByValue.map((row, i) => <tr key={`${row.product}-${i}`} className="hover:bg-slate-50"><td className="px-8 py-4 font-black text-slate-800 uppercase text-xs">{row.product}</td><td className="px-4 py-4 font-bold text-slate-500 uppercase text-xs">{row.brand}</td><td className="px-8 py-4 text-right font-black text-slate-900">₹{Math.round(row.value).toLocaleString()}</td></tr>)}{salesSummaryData.topProductsByValue.length === 0 && <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-black uppercase text-xs">No confirmed sales.</td></tr>}</tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b bg-slate-50"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Cities</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="px-8 py-4">City</th><th className="px-4 py-4 text-center">Orders</th><th className="px-8 py-4 text-right">Value</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{salesSummaryData.topCities.map((row, i) => <tr key={`${row.city}-${i}`} className="hover:bg-slate-50"><td className="px-8 py-4 font-black text-slate-800 uppercase text-xs">{row.city}</td><td className="px-4 py-4 text-center font-black text-indigo-600">{row.orders}</td><td className="px-8 py-4 text-right font-black text-slate-900">₹{Math.round(row.value).toLocaleString()}</td></tr>)}{salesSummaryData.topCities.length === 0 && <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-black uppercase text-xs">No confirmed sales.</td></tr>}</tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b bg-slate-50"><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Clients</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="px-8 py-4">Client</th><th className="px-4 py-4 text-center">Orders</th><th className="px-8 py-4 text-right">Value</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{salesSummaryData.topClients.map((row, i) => <tr key={`${row.client}-${i}`} className="hover:bg-slate-50"><td className="px-8 py-4 font-black text-slate-800 uppercase text-xs">{row.client}</td><td className="px-4 py-4 text-center font-black text-indigo-600">{row.orders}</td><td className="px-8 py-4 text-right font-black text-slate-900">₹{Math.round(row.value).toLocaleString()}</td></tr>)}{salesSummaryData.topClients.length === 0 && <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-black uppercase text-xs">No confirmed sales.</td></tr>}</tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Brand Contribution Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Brand Contribution</h3>
                 <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full">{analyticsData.brandStats.length} Active Brands</span>
              </div>
              <div className="p-0 flex-1">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4">Brand</th>
                        <th className="px-4 py-4 text-right">Revenue</th>
                        <th className="px-8 py-4 text-right">Contribution %</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {analyticsData.brandStats.map((b, i) => (
                        <tr key={b.name} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-4 font-black text-slate-700 uppercase">{b.name}</td>
                           <td className="px-4 py-4 text-right font-bold">₹{b.revenue.toLocaleString()}</td>
                           <td className="px-8 py-4 text-right">
                              <div className="flex items-center justify-end gap-4">
                                 <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${b.contribution}%` }} />
                                 </div>
                                 <span className="text-[11px] font-black text-slate-500 w-10">{b.contribution.toFixed(1)}%</span>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 Brand Revenue Chart */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Brand Velocity Matrix
              </h3>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.brandStats.slice(0, 7)}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="revenue"
                      nameKey="name"
                    >
                      {analyticsData.brandStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                 {analyticsData.brandStats.slice(0, 4).map((b, i) => (
                    <div key={b.name} className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-[10px] font-black text-slate-500 uppercase truncate">{b.name}</span>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportTab === 'performance' && (
        <div className="space-y-8">
           {/* Sales Person Performance Comparison */}
           <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Sales Force Performance</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">MTD vs. Last Month Benchmarking</p>
                 </div>
                 <div className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Benchmark Period</p>
                    <p className="text-[11px] font-black text-indigo-700 uppercase">{analyticsData.lastMonthLabel}</p>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       <tr>
                          <th className="px-8 py-5">Personnel Name</th>
                          <th className="px-6 py-5 text-right">Selected Range</th>
                          <th className="px-6 py-5 text-right">MTD (Current)</th>
                          <th className="px-6 py-5 text-right">Last Month</th>
                          <th className="px-8 py-5 text-center">Trend (LM vs MTD)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {analyticsData.spPerformance.length === 0 ? (
                         <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">No sales activity tracked.</td></tr>
                       ) : (
                         analyticsData.spPerformance.map(sp => {
                           const diff = sp.mtd - sp.lastMonth;
                           const growth = sp.lastMonth > 0 ? (diff / sp.lastMonth) * 100 : (sp.mtd > 0 ? 100 : 0);
                           return (
                             <tr key={sp.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">{sp.name}</td>
                                <td className="px-6 py-5 text-right font-medium text-slate-400">₹{sp.revenue.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right font-black text-indigo-600">₹{sp.mtd.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right font-bold text-slate-600">₹{sp.lastMonth.toLocaleString()}</td>
                                <td className="px-8 py-5 text-center">
                                   <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                      {diff >= 0 ? '↑' : '↓'} {Math.abs(Math.round(growth))}%
                                   </span>
                                </td>
                             </tr>
                           );
                         })
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                 <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Efficiency Indices</h3>
                 <div className="space-y-6">
                    <div>
                       <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Revenue Conversion Goal</span>
                          <span className="text-lg font-black">78%</span>
                       </div>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
                       </div>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                       <p className="text-[9px] text-slate-500 font-bold uppercase">Avg Sales per Rep (Range)</p>
                       <p className="text-3xl font-black">₹{Math.round(analyticsData.metrics.totalConfirmedRevenue / (analyticsData.spPerformance.length || 1)).toLocaleString()}</p>
                    </div>
                 </div>
                 <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              </div>
           </div>
        </div>
      )}

      {reportTab === 'itemwise' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Item-wise Sales Ledger</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">Audit by bookingDate</p>
            </div>
            <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-xl uppercase tracking-widest border border-indigo-200">{itemWiseRows.length} Line Items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5">Booking Date</th>
                  <th className="px-6 py-5">Ref No</th>
                  <th className="px-6 py-5">Rep</th>
                  <th className="px-6 py-5">Product Details</th>
                  <th className="px-6 py-5 text-center">Qty</th>
                  <th className="px-6 py-5 text-right">Total (Incl Tax)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemWiseRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic font-medium">No sales data found for the selected Booking Date range.</td></tr>
                ) : (
                  itemWiseRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.bookingDate}</td>
                      <td className="px-6 py-4 font-black text-indigo-600 tracking-tighter uppercase">{row.orderNo}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">{row.salesPerson || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-700 uppercase leading-none">{row.product}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1 font-bold">{row.model}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-black text-[11px] rounded-lg">{row.qty}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-900">₹{row.total.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{row.gst}% GST</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportsHub;
