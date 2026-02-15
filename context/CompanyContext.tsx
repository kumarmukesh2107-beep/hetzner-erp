
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../types';
import { getModuleSnapshot, postModuleSnapshot } from '../utils/backendApi';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  selectCompany: (id: string) => void;
  isLoading: boolean;
  addCompany: (company: Omit<Company, 'id'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);
const COMPANY_STORAGE_KEY = 'nexus_company_state_v1';

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: 'comp-001',
      name: 'SLP',
      gstNo: 'NA',
      address: 'SULTANPUR',
      city: 'DELHI',
      state: 'DELHI',
      phone: '022-44556677',
      email: 'NA@NA.COM',
      status: 'ACTIVE',
      bankDetails: {
        name: 'DIMENSION',
        accountNo: '432405000757',
        ifsc: 'ICIC0004324',
        branch: 'MANSAROVAR GARDEN'
      },
      terms: [
        "TRANSPORTATION CHARGES EXTRA",
        "PACKING CHARGES EXTRA",
        "GST EXTRA AS APPLICABLE",
        "50% ADVANCE REQUIRED & BALANCE 50% BEFORE DELIVERY",
        "FABRIC UPTO RS-700 PER METER INCLUDED",
        "STONE UPTO RS-400 PER SQFT INCLUDED"
      ]
    },
    {
      id: 'comp-002',
      name: 'PRIME DISTRIBUTION HUB',
      gstNo: '07BBBBB1111B2Z6',
      address: 'Okhla Phase 3, Logistics Park',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '011-22334455',
      email: 'ops@primedist.com',
      status: 'ACTIVE',
      bankDetails: {
        name: 'ICICI BANK LTD',
        accountNo: '001205001122',
        ifsc: 'ICIC0000012',
        branch: 'Okhla Branch'
      },
      terms: [
        "Standard industry 1-year warranty applies where applicable.",
        "Any discrepancies must be reported within 24 hours of delivery.",
        "All payments should be in favor of Prime Distribution Hub.",
        "Interest @ 18% p.a. will be charged for delayed payments."
      ]
    }
  ]);

  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(localStorage.getItem('nexus_active_company'));
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(COMPANY_STORAGE_KEY, null);
    if (saved && Array.isArray(saved.companies)) {
      setCompanies(saved.companies);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(COMPANY_STORAGE_KEY, { companies });
    postModuleSnapshot('companies', { companies });
  }, [companies, isHydrated]);

  useEffect(() => {
    let mounted = true;
    getModuleSnapshot<{ companies?: Company[] }>('companies').then(snapshot => {
      if (!mounted || !snapshot) return;
      if (Array.isArray(snapshot.companies) && snapshot.companies.length > 0) setCompanies(snapshot.companies);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync active company in case it was deactivated
    if (activeCompanyId) {
      const active = companies.find(c => c.id === activeCompanyId);
      if (!active || active.status === 'INACTIVE') {
        setActiveCompanyId(null);
        localStorage.removeItem('nexus_active_company');
      }
    }
    setIsLoading(false);
  }, [companies, activeCompanyId]);

  const selectCompany = (id: string) => {
    const comp = companies.find(c => c.id === id);
    if (comp && comp.status === 'ACTIVE') {
      setActiveCompanyId(id);
      localStorage.setItem('nexus_active_company', id);
    }
  };

  const addCompany = (data: Omit<Company, 'id'>) => {
    setCompanies(prev => [...prev, { ...data, id: `comp-${Date.now()}` }]);
  };

  const updateCompany = (id: string, data: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  return (
    <CompanyContext.Provider value={{ companies, activeCompany, selectCompany, isLoading, addCompany, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
