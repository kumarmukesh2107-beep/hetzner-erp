
import React, { useState } from 'react';
import { usePayroll } from '../../context/PayrollContext';
import { Employee } from '../../types';

const EmployeeMaster: React.FC = () => {
  const { employees, addEmployee, updateEmployee } = usePayroll();
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<Employee>({
    id: '',
    companyId: '',
    name: '',
    status: 'ACTIVE',
    monthlySalary: 0,
    doe: null,
    markLateTime: null,
    weekOffDay: 'SUNDAY',
    gender: 'MALE',
    isExempt: false,
    bankLimit: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      updateEmployee(formData);
    } else {
      addEmployee(formData);
    }
    setShowForm(false);
    setEditingEmp(null);
    setFormData({ id: '', companyId: '', name: '', status: 'ACTIVE', monthlySalary: 0, doe: null, markLateTime: null, weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false, bankLimit: 0 });
  };

  const startEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData(emp);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Employee List</h3>
          <button 
            onClick={() => { setShowForm(true); setEditingEmp(null); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center"
          >
            Add Staff
          </button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Salary</th>
              <th className="px-6 py-4">Mark Late</th>
              <th className="px-6 py-4">Bank Limit</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-slate-500">{emp.id}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{emp.name}</td>
                <td className="px-6 py-4 font-semibold text-slate-700">₹{emp.monthlySalary.toLocaleString()}</td>
                <td className="px-6 py-4 font-mono text-xs text-indigo-600">{emp.markLateTime ? `After ${emp.markLateTime}` : 'Not Set'}</td>
                <td className="px-6 py-4 text-slate-500">{emp.bankLimit ? `₹${emp.bankLimit.toLocaleString()}` : '-'}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => startEdit(emp)} className="text-indigo-600 font-bold hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{editingEmp ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">EMP CODE</label>
                  <input required type="text" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monthly Salary</label>
                  <input required type="number" value={formData.monthlySalary} onChange={e => setFormData({...formData, monthlySalary: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mark Late Time (HH:mm)</label>
                  <input type="time" value={formData.markLateTime || ''} onChange={e => setFormData({...formData, markLateTime: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bank Disbursal Limit (Split)</label>
                  <input type="number" value={formData.bankLimit || 0} onChange={e => setFormData({...formData, bankLimit: Number(e.target.value)})} className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm" placeholder="0 = No Split" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any, isExempt: e.target.value === 'FEMALE'})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Week Off</label>
                  <select value={formData.weekOffDay} onChange={e => setFormData({...formData, weekOffDay: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex items-center py-2 px-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <input type="checkbox" checked={formData.isExempt} onChange={e => setFormData({...formData, isExempt: e.target.checked})} className="h-4 w-4 text-indigo-600 mr-3" />
                  <div>
                    <p className="text-xs font-bold text-indigo-700 uppercase">Exempt from Attendance Deductions</p>
                    <p className="text-[9px] text-indigo-400 uppercase">Ignore absent, late, and sandwich deductions for this staff member.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMaster;
