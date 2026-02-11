
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import { exportDeviceSnapshot, importDeviceSnapshot } from '../utils/deviceTransfer';
import { isCloudSyncConfigured } from '../utils/cloudSync';

interface LogEntry {
  type: 'success' | 'warning' | 'error';
  message: string;
  subMessage?: string;
  errors?: string[];
  timestamp: string;
}

const ImportPage: React.FC = () => {
  const { bulkImportProducts, bulkImportStocks, linkProductImages } = useInventory();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LogEntry[]>([]);
  
  const productInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const cloudEnabled = isCloudSyncConfigured();

  const addLog = (type: LogEntry['type'], message: string, subMessage?: string, errors?: string[]) => {
    setResults(prev => [{
      type,
      message,
      subMessage,
      errors,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const handleProductImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const res = bulkImportProducts(data);
        const status = res.failed > 0 ? 'warning' : 'success';
        addLog(
          status as any,
          'Item Master Processing Complete',
          `${res.success} new created, ${res.updated} updated, ${res.failed} failed.`,
          res.errors
        );
      } catch (err) {
        addLog('error', 'Critical error during Item Master parse', 'Ensure the file is a valid Excel/CSV.');
      } finally {
        setLoading(false);
        if (productInputRef.current) productInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleStockImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const res = bulkImportStocks(data);
        const status = res.failed > 0 ? 'warning' : 'success';
        addLog(
          status as any,
          'Stock Distribution Complete',
          `${res.success} products matched, ${res.failed} rows ignored.`,
          res.errors
        );
      } catch (err) {
        addLog('error', 'Critical error during Stock parse', 'File format invalid.');
      } finally {
        setLoading(false);
        if (stockInputRef.current) stockInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const imageMap = new Map<string, string>();
    const promises = (Array.from(files) as File[]).map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          // Use filename without extension as key, normalize to uppercase for matching
          const name = file.name.split('.').slice(0, -1).join('.').toUpperCase();
          imageMap.set(name, base64);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(promises);
    const count = linkProductImages(imageMap);
    addLog('success', 'Image Linking Complete', `${count} products matched and updated using Filename to Model No mapping.`);
    setLoading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleExportBackup = async () => {
    try {
      const snapshot = await exportDeviceSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const fileName = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      addLog('success', 'Device Backup Exported', 'Download completed. Import this file on the other device to sync data.');
    } catch {
      addLog('error', 'Backup Export Failed', 'Unable to export local ERP data from this browser.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      await importDeviceSnapshot(parsed);
      addLog('success', 'Backup Imported', 'Device data restored. Reloading application now.');
      setTimeout(() => window.location.reload(), 700);
    } catch {
      addLog('error', 'Backup Import Failed', 'Selected file is not a valid NexusERP backup JSON.');
    } finally {
      setLoading(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Data Import Wizard</h1>
          <p className="text-sm text-slate-500 mt-1">Populate product catalog, warehouse stocks, and media library.</p>
        </div>
        {loading && (
          <div className="flex items-center text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-full animate-pulse">
            <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            System Working...
          </div>
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs md:text-sm font-black text-indigo-700 uppercase tracking-wide">Cross-device data sync</p>
          <p className="text-xs text-indigo-600 mt-1">
            {cloudEnabled
              ? 'Backend sync is active. Changes from this ERP will auto-sync across devices/users for the same company.'
              : 'Backend sync is not configured. Use backup export/import below to transfer data between devices.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3 py-2 text-[11px] font-black uppercase tracking-wide rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Export Backup
          </button>
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="px-3 py-2 text-[11px] font-black uppercase tracking-wide rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          >
            Import Backup
          </button>
          <input ref={backupInputRef} onChange={handleImportBackup} type="file" hidden accept="application/json" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Item Master */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">1. Item Master</h3>
          <p className="text-xs text-slate-400 mb-6 px-4">Upload catalog to create or update products by Model No.</p>
          <button 
            onClick={() => productInputRef.current?.click()}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-black rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100"
          >
            Select Excel
          </button>
          <input type="file" ref={productInputRef} onChange={handleProductImport} hidden accept=".xlsx, .xls, .csv" />
        </div>

        {/* Step 2: Warehouse Stock */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">2. Warehouse Stock</h3>
          <p className="text-xs text-slate-400 mb-6 px-4">Distribute quantities into Display, Godown, Booked, and Repair.</p>
          <button 
            onClick={() => stockInputRef.current?.click()}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-black rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100"
          >
            Select Stock File
          </button>
          <input type="file" ref={stockInputRef} onChange={handleStockImport} hidden accept=".xlsx, .xls, .csv" />
        </div>

        {/* Step 3: Images */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800">3. Product Images</h3>
          <p className="text-xs text-slate-400 mb-6 px-4">Upload media files named by Model No to link them automatically.</p>
          <button 
            onClick={() => imageInputRef.current?.click()}
            className="w-full py-2.5 bg-orange-600 text-white text-sm font-black rounded-lg hover:bg-orange-700 shadow-lg shadow-orange-100"
          >
            Select Images
          </button>
          <input type="file" ref={imageInputRef} onChange={handleImageUpload} hidden multiple accept="image/*" />
        </div>
      </div>

      {/* Activity Log / Results */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">Import & Validation Report</h3>
          <button onClick={() => setResults([])} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Clear Logs</button>
        </div>
        <div className="divide-y divide-slate-100">
          {results.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
              <svg className="w-16 h-16 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="font-bold">Waiting for input files...</p>
            </div>
          ) : (
            results.map((res, i) => (
              <div key={i} className="px-6 py-6 group hover:bg-slate-50 transition-colors">
                <div className="flex items-start">
                  <div className={`mt-1 w-3 h-3 rounded-full shrink-0 mr-4 ${
                    res.type === 'success' ? 'bg-emerald-500 shadow-sm' : res.type === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{res.message}</p>
                      <span className="text-[10px] font-bold text-slate-400">{res.timestamp}</span>
                    </div>
                    {res.subMessage && <p className="text-xs text-slate-500 font-medium">{res.subMessage}</p>}
                    
                    {res.errors && res.errors.length > 0 && (
                      <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Detailed Error Report</p>
                        <ul className="space-y-1">
                          {res.errors.map((err, idx) => (
                            <li key={idx} className="text-xs text-red-700 flex items-center">
                              <span className="w-1 h-1 bg-red-400 rounded-full mr-2"></span>
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
