
import React, { useState } from 'react';
import { Employee, PayrollRecord } from '../types';
import { usePayroll } from '../context/PayrollContext';
import { useAccounting } from '../context/AccountingContext';

interface NewSalaryPageProps {
  employee: Employee;
  onBack: () => void;
}

const NewSalaryPage: React.FC<NewSalaryPageProps> = ({ employee, onBack }) => {
  const { savePayrollRecord } = usePayroll();
  const { accounts } = useAccounting();

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    month: currentMonth,
    year: currentYear,
    bonus: 0,
    deductions: 0,
    accountId: 'hdfc'
  });

  const netSalary = employee.monthlySalary + formData.bonus - formData.deductions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fix: Added missing leaveBalance property to satisfy PayrollRecord interface
    const payrollRecord: PayrollRecord = {
      id: `PR-MANUAL-${employee.id}-${formData.month}-${formData.year}`,
      // Added companyId property from employee to satisfy PayrollRecord requirements
      companyId: employee.companyId,
      empCode: employee.id,
      name: employee.name,
      month: formData.month,
      year: formData.year,
      present: 30,
      absent: 0,
      halfDays: 0,
      lateCount: 0,
      lateDeductionDays: 0,
      holidays: 0,
      weekOff: 0,
      sandwichLeave: 0,
      extraPaidDays: 0,
      basicSalary: employee.monthlySalary,
      incentive: formData.bonus,
      conveyance: 0,
      grossSalary: employee.monthlySalary + formData.bonus,
      attendanceDeduction: 0,
      penaltySuperfone: 0,
      penaltyDress: 0,
      penaltyCRM: 0,
      manualAdjustment: -formData.deductions,
      totalDeduction: formData.deductions,
      netSalary,
      bankAmount: netSalary, // Always Bank since Cheque is gone
      pdcAmount: 0,
      status: 'PAID',
      processedAt: new Date().toISOString(),
      leaveBalance: 0
    };

    savePayrollRecord(payrollRecord);
    alert(`Salary for ${employee.name} processed and account balance updated.`);
    onBack();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Process Salary</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-start">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl mr-6">
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{employee.name}</h2>
              <div className="grid grid-cols-2 gap-y-1 gap-x-8 mt-2">
                <p className="text-xs text-slate-500 font-medium">Employee ID: <span className="text-slate-800">{employee.id}</span></p>
                <p className="text-xs text-slate-500 font-medium">Status: <span className="text-slate-800">{employee.status}</span></p>
                <p className="text-xs text-slate-500 font-medium">DOE: <span className="text-slate-800">{employee.doe || 'N/A'}</span></p>
                <p className="text-xs text-slate-500 font-medium">Week Off: <span className="text-slate-800">{employee.weekOffDay}</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Salary Month</label>
                  <select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Year</label>
                  <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Additional Bonus (₹)</label>
                  <input type="number" value={formData.bonus} onChange={e => setFormData({...formData, bonus: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-emerald-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deductions (₹)</label>
                  <input type="number" value={formData.deductions} onChange={e => setFormData({...formData, deductions: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Disburse From Account</label>
                  <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (₹{acc.balance.toLocaleString('en-IN')})</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-50 text-lg">
                Complete Disbursal
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-2xl">
            <h3 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-6">Payslip Preview</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Basic Salary</span>
                <span className="font-bold">₹{employee.monthlySalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Bonus</span>
                <span className="font-bold text-emerald-400">+₹{formData.bonus.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Deductions</span>
                <span className="font-bold text-red-400">-₹{formData.deductions.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase">Net Payable</span>
                <span className="text-3xl font-black text-white">₹{netSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
              Processing salary will automatically create an entry in the Accounting module under "Salary" expense and deduct the balance from the selected bank/cash account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSalaryPage;
