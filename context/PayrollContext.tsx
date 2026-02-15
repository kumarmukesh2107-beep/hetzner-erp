
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Employee, Holiday, PayrollRecord, DailyAttendance, AttendanceStatus } from '../types';
import { useAccounting } from './AccountingContext';
import { useCompany } from './CompanyContext';
import { getModuleSnapshot, postModuleSnapshot } from '../utils/backendApi';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface PayrollContextType {
  employees: Employee[];
  holidays: Holiday[];
  payrollHistory: PayrollRecord[];
  dailyAttendance: DailyAttendance[];
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  addHoliday: (h: Omit<Holiday, 'id' | 'companyId'>) => void;
  deleteHoliday: (id: string) => void;
  processBiometricData: (month: string, year: number, rawBlocks: any[]) => void;
  savePayrollRecord: (record: PayrollRecord) => void;
  updateDailyAttendance: (attendance: DailyAttendance) => void;
  getEmployeeByCodeOrName: (code: string, name: string) => Employee | undefined;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);
const PAYROLL_STORAGE_KEY = 'nexus_payroll_state_v1';

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addExpense } = useAccounting();
  const { activeCompany } = useCompany();

  const [allEmployees, setAllEmployees] = useState<Employee[]>([
    { id: '7', companyId: 'comp-001', name: 'ROSHNI', status: 'ACTIVE', monthlySalary: 43000, doe: '2023-01-15', markLateTime: '11:15', weekOffDay: 'MONDAY', gender: 'FEMALE', isExempt: false },
    { id: '4', companyId: 'comp-001', name: 'DIVYA JI', status: 'ACTIVE', monthlySalary: 150000, doe: '2022-05-10', markLateTime: '13:15', weekOffDay: 'SATURDAY', gender: 'FEMALE', isExempt: false, bankLimit: 45000 },
    { id: '15', companyId: 'comp-001', name: 'MANJU', status: 'ACTIVE', monthlySalary: 14000, doe: '2023-08-20', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'FEMALE', isExempt: false },
    { id: '16', companyId: 'comp-001', name: 'RAJ', status: 'ACTIVE', monthlySalary: 16000, doe: '2023-09-01', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false },
    { id: '19', companyId: 'comp-001', name: 'ANJALI PAL', status: 'ACTIVE', monthlySalary: 220000, doe: '2022-11-01', markLateTime: '23:15', weekOffDay: 'FRIDAY', gender: 'FEMALE', isExempt: false, bankLimit: 75000 },
    { id: 'MANUAL01', companyId: 'comp-001', name: 'AMRSIH', status: 'ACTIVE', monthlySalary: 30000, doe: '2024-01-01', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false },
    { id: 'MANUAL02', companyId: 'comp-001', name: 'GUARD', status: 'ACTIVE', monthlySalary: 22000, doe: '2024-01-01', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false },
    { id: 'MANUAL03', companyId: 'comp-001', name: 'MALI', status: 'ACTIVE', monthlySalary: 1500, doe: '2024-01-01', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false },
    { id: 'MANUAL04', companyId: 'comp-001', name: 'GENESET EXP', status: 'ACTIVE', monthlySalary: 9000, doe: '2024-01-01', markLateTime: '10:05', weekOffDay: 'SUNDAY', gender: 'MALE', isExempt: false },
  ]);

  const [allHolidays, setAllHolidays] = useState<Holiday[]>([
    { id: 'h2026-1', companyId: 'comp-001', date: '2026-01-01', name: "New Year's Day" },
    { id: 'h2026-2', companyId: 'comp-001', date: '2026-01-26', name: 'Republic Day' },
    { id: 'h2026-3', companyId: 'comp-001', date: '2026-03-04', name: 'Holi' },
    { id: 'h2026-4', companyId: 'comp-001', date: '2026-08-15', name: 'Independence Day' },
    { id: 'h2026-5', companyId: 'comp-001', date: '2026-10-02', name: 'Gandhi Jayanti' },
    { id: 'h2026-6', companyId: 'comp-001', date: '2026-11-08', name: 'Diwali' },
    { id: 'h2026-7', companyId: 'comp-001', date: '2026-11-09', name: 'Vishwakarma Puja' },
  ]);

  const [allPayrollHistory, setAllPayrollHistory] = useState<PayrollRecord[]>([]);
  const [allDailyAttendance, setAllDailyAttendance] = useState<DailyAttendance[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(PAYROLL_STORAGE_KEY, null);
    if (saved) {
      if (Array.isArray(saved.employees)) setAllEmployees(saved.employees);
      if (Array.isArray(saved.holidays)) setAllHolidays(saved.holidays);
      if (Array.isArray(saved.payrollHistory)) setAllPayrollHistory(saved.payrollHistory);
      if (Array.isArray(saved.dailyAttendance)) setAllDailyAttendance(saved.dailyAttendance);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const snapshot = {
      employees: allEmployees,
      holidays: allHolidays,
      payrollHistory: allPayrollHistory,
      dailyAttendance: allDailyAttendance,
    };
    saveLocalState(PAYROLL_STORAGE_KEY, snapshot);
    postModuleSnapshot('payroll', snapshot);
  }, [allEmployees, allHolidays, allPayrollHistory, allDailyAttendance, isHydrated]);

  useEffect(() => {
    let mounted = true;
    getModuleSnapshot<any>('payroll').then(snapshot => {
      if (!mounted || !snapshot || typeof snapshot !== 'object') return;
      if (Array.isArray(snapshot.employees) && snapshot.employees.length > 0) setAllEmployees(snapshot.employees);
      if (Array.isArray(snapshot.holidays)) setAllHolidays(snapshot.holidays);
      if (Array.isArray(snapshot.payrollHistory)) setAllPayrollHistory(snapshot.payrollHistory);
      if (Array.isArray(snapshot.dailyAttendance)) setAllDailyAttendance(snapshot.dailyAttendance);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Normalize disbursal split: default all salary to PDC, only bankLimit-defined amounts go to bank transfer.
  useEffect(() => {
    if (!isHydrated) return;
    setAllPayrollHistory(prev => prev.map(record => {
      const emp = allEmployees.find(e => e.companyId === record.companyId && e.id === record.empCode);
      const bankCap = emp?.bankLimit || 0;
      const normalizedBank = Math.min(record.netSalary, Math.max(0, bankCap));
      const normalizedPdc = record.netSalary - normalizedBank;
      if (record.bankAmount === normalizedBank && record.pdcAmount === normalizedPdc) return record;
      return { ...record, bankAmount: normalizedBank, pdcAmount: normalizedPdc };
    }));
  }, [allEmployees, isHydrated]);

  const employees = useMemo(() => 
    allEmployees.filter(e => e.companyId === activeCompany?.id), 
    [allEmployees, activeCompany]
  );

  const holidays = useMemo(() => 
    allHolidays.filter(h => h.companyId === activeCompany?.id), 
    [allHolidays, activeCompany]
  );

  const payrollHistory = useMemo(() => 
    allPayrollHistory.filter(p => p.companyId === activeCompany?.id), 
    [allPayrollHistory, activeCompany]
  );

  const dailyAttendance = useMemo(() => 
    allDailyAttendance.filter(d => d.companyId === activeCompany?.id),
    [allDailyAttendance, activeCompany]
  );

  const addEmployee = (emp: Employee) => {
    if (!activeCompany) return;
    setAllEmployees(prev => [...prev, { ...emp, companyId: activeCompany.id }]);
  };
  
  const updateEmployee = (emp: Employee) => setAllEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  
  const addHoliday = (h: Omit<Holiday, 'id' | 'companyId'>) => {
    if (!activeCompany) return;
    setAllHolidays(prev => [...prev, { ...h, id: `h-${Date.now()}`, companyId: activeCompany.id }]);
  };

  const deleteHoliday = (id: string) => setAllHolidays(prev => prev.filter(h => h.id !== id));

  const getDelayDuration = (inTime: string, limitTime: string): string => {
    if (!inTime || !limitTime || inTime === '00:00' || inTime === 'NS') return '00:00';
    const [inH, inM] = inTime.split(':').map(Number);
    const [limH, limM] = limitTime.split(':').map(Number);
    const inTotal = inH * 60 + inM;
    const limTotal = limH * 60 + limM;
    if (inTotal <= limTotal) return '00:00';
    const diff = inTotal - limTotal;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getEmployeeByCodeOrName = useCallback((code: string, name: string) => {
    const cleanName = name.trim().toUpperCase();
    const cleanCode = code.trim().toUpperCase();
    
    let found = employees.find(e => e.id.toUpperCase() === cleanCode);
    if (!found) {
      found = employees.find(e => {
        const masterNameNorm = e.name.replace(/\s/g, '').toUpperCase();
        const reportNameNorm = cleanName.replace(/\s/g, '');
        return masterNameNorm.includes(reportNameNorm) || reportNameNorm.includes(masterNameNorm);
      });
    }
    return found;
  }, [employees]);

  const getWeekOffCountForMonth = (month: string, year: number, dayName: string) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const dayIndexMap: Record<string, number> = {
      'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };
    const targetDay = dayIndexMap[dayName.toUpperCase()];
    if (targetDay === undefined) return 4;
    
    let count = 0;
    const date = new Date(year, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      if (date.getDay() === targetDay) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  const processBiometricData = useCallback((month: string, year: number, rawBlocks: any[]) => {
    if (!activeCompany) return;

    const normalizeStatus = (s: string): AttendanceStatus => {
      const clean = (s || '').trim().toUpperCase();
      if (clean === 'P' || clean === 'PRESENT') return AttendanceStatus.PRESENT;
      if (clean === 'A' || clean === 'ABSENT') return AttendanceStatus.ABSENT;
      if (clean === 'WO' || clean === 'WEEK_OFF' || clean === 'W') return AttendanceStatus.WEEK_OFF;
      if (clean === 'H' || clean === 'HOLIDAY') return AttendanceStatus.HOLIDAY;
      if (clean === 'HD' || clean === 'HALF_DAY') return AttendanceStatus.HALF_DAY;
      return AttendanceStatus.ABSENT;
    };

    const newDailyRecords: DailyAttendance[] = [];
    const newPayrollRecords: PayrollRecord[] = rawBlocks.map(block => {
      const emp = getEmployeeByCodeOrName(block.empCode, block.name);
      if (!emp) return null;

      let empLateCount = 0;

      if (block.dailyEntries) {
        block.dailyEntries.forEach((entry: any) => {
          const status = normalizeStatus(entry.status);
          const ruleLateBy = getDelayDuration(entry.inTime, emp.markLateTime || '10:00');
          const isLate = ruleLateBy !== '00:00' && status === AttendanceStatus.PRESENT;
          if (isLate) empLateCount++;

          newDailyRecords.push({
            id: `ATT-${emp.id}-${entry.date}`,
            companyId: activeCompany.id,
            empCode: emp.id,
            date: entry.date,
            month,
            year,
            inTime: entry.inTime || '00:00',
            outTime: entry.outTime || '00:00',
            lateBy: ruleLateBy,
            status: status,
            manualOverride: false
          });
        });
      }

      const workingDaysInMonth = 30; 
      const perDaySalary = emp.monthlySalary / workingDaysInMonth;
      const totalReportAbsent = block.absent || 0;
      const weekOff = getWeekOffCountForMonth(month, year, emp.weekOffDay);
      const netAbsent = Math.max(0, totalReportAbsent - weekOff);
      
      const lateDeductionDays = empLateCount <= 2 ? 0 : (empLateCount - 2) * 0.5;
      const totalDeductionDays = netAbsent + (block.halfDays || 0) * 0.5 + lateDeductionDays;
      const attendanceDeduction = Math.round(totalDeductionDays * perDaySalary);
      
      const grossSalary = Math.round(emp.monthlySalary + (block.incentive || 0) + (block.conveyance || 0));
      const totalDeduction = attendanceDeduction + (block.penaltyCRM || 0) + (block.penaltySuperfone || 0) + (block.penaltyDress || 0) + (block.manualAdjustment || 0);
      const netSalary = grossSalary - totalDeduction;

      const bankCap = emp.bankLimit || 0;
      const bankAmount = Math.min(netSalary, Math.max(0, bankCap));
      const pdcAmount = netSalary - bankAmount;

      return {
        id: `PR-${emp.id}-${month}-${year}`,
        companyId: activeCompany.id,
        empCode: emp.id,
        name: emp.name,
        month,
        year,
        present: block.present || 0,
        absent: totalReportAbsent,
        halfDays: block.halfDays || 0,
        lateCount: empLateCount,
        lateDeductionDays,
        holidays: block.holidays || 0,
        weekOff,
        sandwichLeave: 0,
        extraPaidDays: 0,
        basicSalary: emp.monthlySalary,
        incentive: block.incentive || 0,
        conveyance: block.conveyance || 0,
        grossSalary,
        attendanceDeduction,
        penaltySuperfone: block.penaltySuperfone || 0,
        penaltyDress: block.penaltyDress || 0,
        penaltyCRM: block.penaltyCRM || 0,
        manualAdjustment: block.manualAdjustment || 0,
        totalDeduction,
        netSalary,
        bankAmount,
        pdcAmount,
        status: 'UNPAID',
        processedAt: new Date().toISOString()
      } as PayrollRecord;
    }).filter(r => r !== null) as PayrollRecord[];

    setAllDailyAttendance(prev => {
      const filteredPrev = prev.filter(p => !(p.month === month && p.year === year && p.companyId === activeCompany.id));
      return [...filteredPrev, ...newDailyRecords];
    });

    setAllPayrollHistory(prev => {
      const filteredPrev = prev.filter(p => !(p.month === month && p.year === year && p.companyId === activeCompany.id));
      return [...filteredPrev, ...newPayrollRecords];
    });
  }, [getEmployeeByCodeOrName, activeCompany, getDelayDuration]);

  const savePayrollRecord = useCallback((record: PayrollRecord) => {
    setAllPayrollHistory(prev => {
      const exists = prev.some(p => p.id === record.id);
      if (exists) {
        return prev.map(p => p.id === record.id ? record : p);
      }
      return [record, ...prev];
    });
    
    if (record.status === 'PAID') {
      addExpense({
        date: new Date().toISOString().split('T')[0],
        category: 'Salary Expense',
        description: `Payroll: ${record.name} - ${record.month} ${record.year}`,
        amount: record.netSalary,
        accountId: 'bank-hdfc-1'
      });
    }
  }, [addExpense]);

  const updateDailyAttendance = useCallback((attendance: DailyAttendance) => {
    if (!activeCompany) return;

    setAllDailyAttendance(prev => {
      const finalizedAttendance = { ...attendance, companyId: activeCompany.id, manualOverride: true };
      const exists = prev.some(a => a.id === finalizedAttendance.id);
      const nextAttendance = exists
        ? prev.map(a => a.id === finalizedAttendance.id ? finalizedAttendance : a)
        : [finalizedAttendance, ...prev];

      setAllPayrollHistory(prevPayroll => prevPayroll.map(record => {
        if (
          record.companyId !== activeCompany.id ||
          record.empCode !== finalizedAttendance.empCode ||
          record.month !== finalizedAttendance.month ||
          record.year !== finalizedAttendance.year
        ) {
          return record;
        }

        const emp = allEmployees.find(e => e.companyId === activeCompany.id && e.id === record.empCode);
        if (!emp) return record;

        const monthlyEntries = nextAttendance.filter(a =>
          a.companyId === activeCompany.id &&
          a.empCode === record.empCode &&
          a.month === record.month &&
          a.year === record.year
        );

        const present = monthlyEntries.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const absent = monthlyEntries.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const halfDays = monthlyEntries.filter(a => a.status === AttendanceStatus.HALF_DAY).length;

        let lateCount = 0;
        monthlyEntries.forEach((entry) => {
          if (entry.status !== AttendanceStatus.PRESENT || !entry.inTime || entry.inTime === '00:00' || entry.inTime === 'NS' || !emp.markLateTime) return;
          const [inH, inM] = entry.inTime.split(':').map(Number);
          const [limH, limM] = emp.markLateTime.split(':').map(Number);
          if ((inH * 60 + inM) > (limH * 60 + limM)) lateCount++;
        });

        const workingDaysInMonth = 30;
        const perDaySalary = emp.monthlySalary / workingDaysInMonth;
        const netAbsent = Math.max(0, absent - record.weekOff);
        const lateDeductionDays = lateCount <= 2 ? 0 : (lateCount - 2) * 0.5;
        const totalDeductionDays = netAbsent + (halfDays * 0.5) + lateDeductionDays;
        const attendanceDeduction = Math.round(totalDeductionDays * perDaySalary);

        const extraDaysEarnings = Math.round((record.extraPaidDays || 0) * perDaySalary);
        const grossSalary = Math.round(emp.monthlySalary + record.incentive + (record.conveyance || 0) + extraDaysEarnings);
        const totalDeduction = attendanceDeduction + record.penaltyCRM + record.penaltySuperfone + record.penaltyDress + record.manualAdjustment;
        const netSalary = grossSalary - totalDeduction;

        const bankCap = emp.bankLimit || 0;
        const bankAmount = Math.min(netSalary, Math.max(0, bankCap));
        const pdcAmount = netSalary - bankAmount;

        return {
          ...record,
          present,
          absent,
          halfDays,
          lateCount,
          lateDeductionDays,
          attendanceDeduction,
          grossSalary,
          totalDeduction,
          netSalary,
          bankAmount,
          pdcAmount,
          processedAt: new Date().toISOString(),
        };
      }));

      return nextAttendance;
    });
  }, [activeCompany, allEmployees]);

  return (
    <PayrollContext.Provider value={{ 
      employees, 
      holidays, 
      payrollHistory, 
      dailyAttendance,
      addEmployee, 
      updateEmployee, 
      addHoliday, 
      deleteHoliday,
      processBiometricData,
      savePayrollRecord,
      updateDailyAttendance,
      getEmployeeByCodeOrName
    }}>
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) throw new Error('usePayroll must be used within PayrollProvider');
  return context;
};
