
import React, { useState } from 'react';
import { usePayroll } from '../context/PayrollContext';
import EmployeeMaster from './Payroll/EmployeeMaster';
import HolidayMaster from './Payroll/HolidayMaster';
import PayrollProcess from './Payroll/PayrollProcess';
import SalarySlips from './Payroll/SalarySlips';
import PayrollDashboard from './Payroll/PayrollDashboard';
import DetailedAttendance from './Payroll/DetailedAttendance';

const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payroll' | 'detailed' | 'employees' | 'holidays' | 'slips'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg> },
    { id: 'payroll', label: 'Payroll', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'detailed', label: 'Attendance', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'employees', label: 'Employees', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'holidays', label: 'Holidays', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'slips', label: 'Slips', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> },
  ];

  return (
    <div className="space-y-6 px-1 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 uppercase tracking-tight">Payroll</h1>
          <p className="text-[10px] md:text-sm text-slate-500 mt-1 uppercase tracking-widest font-black">HR Control Hub</p>
        </div>
        
        <div className="flex p-1 bg-slate-200 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide whitespace-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 md:px-5 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'dashboard' && <PayrollDashboard />}
        {activeTab === 'employees' && <EmployeeMaster />}
        {activeTab === 'holidays' && <HolidayMaster />}
        {activeTab === 'payroll' && <PayrollProcess />}
        {activeTab === 'detailed' && <DetailedAttendance />}
        {activeTab === 'slips' && <SalarySlips />}
      </div>
    </div>
  );
};

export default PayrollPage;
