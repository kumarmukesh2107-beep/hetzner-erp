
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Customer } from '../types';
import { getModuleSnapshot, postModuleSnapshot } from '../utils/backendApi';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (mobile: string, data: Partial<Customer>) => void;
  getCustomerByMobile: (mobile: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);
const CUSTOMER_STORAGE_KEY = 'nexus_customer_state_v1';

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '9876543210',
      name: 'WALK-IN CUSTOMER',
      mobile: '9876543210',
      billingAddress: 'Main Showroom',
      city: 'Local',
      state: 'Local State',
      createdAt: new Date().toISOString()
    },
    {
      id: '9999900001',
      name: 'MUKEH',
      mobile: '9999900001',
      billingAddress: 'Street 1, City A',
      city: 'City A',
      state: 'State X',
      createdAt: new Date().toISOString()
    },
    {
      id: '9999900002',
      name: 'SUMIT',
      mobile: '9999900002',
      billingAddress: 'Lane 5, City B',
      city: 'City B',
      state: 'State Y',
      createdAt: new Date().toISOString()
    }
  ]);


  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(CUSTOMER_STORAGE_KEY, null);
    if (saved && Array.isArray(saved.customers)) setCustomers(saved.customers);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(CUSTOMER_STORAGE_KEY, { customers });
    postModuleSnapshot('customers', { customers });
  }, [customers, isHydrated]);

  useEffect(() => {
    let mounted = true;
    getModuleSnapshot<{ customers?: Customer[] }>('customers').then(snapshot => {
      if (!mounted || !snapshot) return;
      if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) setCustomers(snapshot.customers);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const getCustomerByMobile = useCallback((mobile: string) => {
    return customers.find(c => c.mobile === mobile);
  }, [customers]);

  const addCustomer = useCallback((data: Omit<Customer, 'id' | 'createdAt'>) => {
    const existing = customers.find(c => c.mobile === data.mobile);
    if (existing) return existing;

    const newCustomer: Customer = {
      ...data,
      id: data.mobile, // Use mobile as the unique ID
      createdAt: new Date().toISOString()
    };

    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, [customers]);

  const updateCustomer = useCallback((mobile: string, data: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.mobile === mobile ? { ...c, ...data } : c));
  }, []);

  const searchCustomers = useCallback((query: string) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return customers.filter(c => 
      c.mobile.includes(query) || 
      c.name.toLowerCase().includes(lowerQuery)
    );
  }, [customers]);

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, updateCustomer, getCustomerByMobile, searchCustomers }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomers must be used within CustomerProvider');
  return context;
};
