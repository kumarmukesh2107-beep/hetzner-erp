
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Contact, ContactType, ContactCategory, CONTACT_CATEGORIES } from '../types';
import { useAccounting } from './AccountingContext';
import { useCompany } from './CompanyContext';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface ContactImportResult {
  success: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface ContactContextType {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'companyId'>) => Contact;
  updateContact: (id: string, data: Partial<Contact>) => void;
  bulkImportContacts: (data: any[], mode: 'add_only' | 'add_update') => ContactImportResult;
  getContactById: (id: string) => Contact | undefined;
  getContactByMobile: (mobile: string) => Contact | undefined;
  searchContacts: (query: string, category?: ContactCategory) => Contact[];
  getContactBalance: (id: string) => number;
  getContactLedger: (id: string) => any[];
  mergeContacts: (primaryId: string, duplicateId: string) => boolean;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);
const CONTACT_STORAGE_KEY = 'nexus_contact_state_v1';

export const ContactProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ledger } = useAccounting();
  const { activeCompany } = useCompany();
  
  const [allContacts, setAllContacts] = useState<Contact[]>([
    {
      id: 'comp-001-9876543210',
      companyId: 'comp-001',
      name: 'WALK-IN CUSTOMER',
      type: ContactType.CUSTOMER,
      contactTypes: ['Customer'],
      mobile: '9876543210',
      billingAddress: 'Main Showroom',
      city: 'Local',
      state: 'Local State',
      openingBalance: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'comp-001-1234567890',
      companyId: 'comp-001',
      name: 'DIMENSION',
      type: ContactType.SUPPLIER,
      contactTypes: ['Supplier'],
      mobile: '1234567890',
      billingAddress: 'Manesar, Haryana',
      city: 'Manesar',
      state: 'Haryana',
      openingBalance: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ]);


  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(CONTACT_STORAGE_KEY, null);
    if (saved && Array.isArray(saved.contacts)) {
      setAllContacts(saved.contacts);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(CONTACT_STORAGE_KEY, { contacts: allContacts });
  }, [allContacts, isHydrated]);

  const contacts = useMemo(() => 
    allContacts.filter(c => c.companyId === activeCompany?.id), 
    [allContacts, activeCompany]
  );

  const getContactById = useCallback((id: string) => contacts.find(c => c.id === id), [contacts]);
  const getContactByMobile = useCallback((mobile: string) => contacts.find(c => c.mobile === mobile), [contacts]);

  const addContact = useCallback((data: Omit<Contact, 'id' | 'createdAt' | 'companyId'>) => {
    if (!activeCompany) throw new Error('No active company');
    
    const existing = contacts.find(c => c.mobile === data.mobile);
    if (existing) {
      alert(`Error: A contact with mobile ${data.mobile} already exists (${existing.name}).`);
      return existing;
    }

    const newContact: Contact = {
      ...data,
      id: `${activeCompany.id}-${data.mobile || Date.now()}`,
      companyId: activeCompany.id,
      createdAt: new Date().toISOString()
    };

    setAllContacts(prev => [...prev, newContact]);
    return newContact;
  }, [contacts, activeCompany]);

  const updateContact = useCallback((id: string, data: Partial<Contact>) => {
    setAllContacts(prev => {
      if (data.mobile) {
        const existing = prev.find(c => c.mobile === data.mobile && c.id !== id && c.companyId === activeCompany?.id);
        if (existing) {
          alert(`Error: Mobile number ${data.mobile} is already used by another contact.`);
          return prev;
        }
      }
      return prev.map(c => c.id === id ? { ...c, ...data } : c);
    });
  }, [activeCompany]);

  const bulkImportContacts = useCallback((data: any[], mode: 'add_only' | 'add_update'): ContactImportResult => {
    if (!activeCompany) return { success: 0, updated: 0, failed: 0, errors: ['No active company context.'] };

    const result: ContactImportResult = { success: 0, updated: 0, failed: 0, errors: [] };
    const newBatch: Contact[] = [];
    const updateBatch: Record<string, Partial<Contact>> = {};

    const categoryMap: Record<string, ContactCategory> = {
      customer: 'Customer',
      supplier: 'Supplier',
      architect: 'Architect',
      employee: 'Employee',
      contractor: 'Contractor',
      transporter: 'Transporter',
      other: 'Other'
    };

    data.forEach((row, index) => {
      const rowNum = index + 2;
      const name = String(row['name*'] || row['name'] || row['Name'] || '').trim();
      const mobile = String(row['mobile*'] || row['mobile'] || row['Mobile'] || '').trim().replace(/[^\d]/g, '');
      const typesStr = String(
        row['contact_type*'] ||
        row['contact_type'] ||
        row['Contact Types'] ||
        row['mapped_types'] ||
        row['Mapped Types'] ||
        ''
      );
      
      // Mandatory Validations
      if (!name) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Name is missing.`);
        return;
      }
      if (!mobile || mobile.length < 10) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Invalid or missing mobile number (10 digits required).`);
        return;
      }

      // Categorization
      const parsedTypes = Array.from(
        new Set(
          typesStr
            .split(',')
            .map(t => categoryMap[t.trim().toLowerCase()])
            .filter(Boolean)
        )
      ) as ContactCategory[];
      
      if (parsedTypes.length === 0) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Missing or invalid contact types. Use one or more of ${CONTACT_CATEGORIES.join(', ')}.`);
        return;
      }

      const existing = contacts.find(c => c.mobile === mobile);
      
      const contactData: Partial<Contact> = {
        name: name.toUpperCase(),
        mobile,
        contactTypes: parsedTypes,
        type: parsedTypes.includes('Supplier') ? ContactType.SUPPLIER : ContactType.CUSTOMER,
        email: String(row['email'] || row['Email'] || ''),
        billingAddress: String(row['address'] || row['Address'] || ''),
        city: String(row['city'] || row['City'] || ''),
        state: String(row['state'] || row['State'] || ''),
        gstNo: String(row['gst_no'] || row['GST No'] || '').toUpperCase(),
        status: String(row['status'] || row['Status'] || 'Active'),
        openingBalance: Number(row['opening_balance'] || row['Opening Balance'] || 0)
      };

      if (existing) {
        if (mode === 'add_only') {
          result.failed++;
          result.errors.push(`Row ${rowNum}: Contact ${mobile} already exists. Skipped (Add New Only mode).`);
          return;
        }
        updateBatch[existing.id] = contactData;
        result.updated++;
      } else {
        newBatch.push({
          ...contactData as Contact,
          id: `${activeCompany.id}-${mobile}`,
          companyId: activeCompany.id,
          createdAt: new Date().toISOString()
        });
        result.success++;
      }
    });

    setAllContacts(prev => {
      let next = [...prev];
      if (Object.keys(updateBatch).length > 0) {
        next = next.map(c => updateBatch[c.id] ? { ...c, ...updateBatch[c.id] } : c);
      }
      return [...next, ...newBatch];
    });

    return result;
  }, [activeCompany, contacts]);

  const searchContacts = useCallback((query: string, category?: ContactCategory) => {
    const lowerQuery = query.toLowerCase();

    return contacts.filter(c => {
      const normalizedTypes = Array.isArray(c.contactTypes) ? c.contactTypes : [];
      const inferredTypes: ContactCategory[] = [];

      if (c.type === ContactType.CUSTOMER) inferredTypes.push('Customer');
      if (c.type === ContactType.SUPPLIER) inferredTypes.push('Supplier');

      const availableTypes = new Set<ContactCategory>([...normalizedTypes, ...inferredTypes]);
      const matchesCategory = !category || availableTypes.has(category);
      const matchesQuery = !query || c.mobile.includes(query) || c.name.toLowerCase().includes(lowerQuery);

      return matchesCategory && matchesQuery;
    });
  }, [contacts]);

  const getContactBalance = useCallback((id: string) => {
    const contact = getContactById(id);
    if (!contact) return 0;
    
    const partyEntries = ledger.filter(e => e.partyId === id);
    let balance = contact.openingBalance || 0;

    partyEntries.forEach(e => {
      if (contact.type === ContactType.CUSTOMER) {
        balance = balance + (e.debit || 0) - (e.credit || 0);
      } else {
        balance = balance + (e.credit || 0) - (e.debit || 0);
      }
    });

    return balance;
  }, [getContactById, ledger]);

  const getContactLedger = useCallback((id: string) => {
    const contact = getContactById(id);
    if (!contact) return [];
    
    let balance = contact.openingBalance || 0;
    return ledger
      .filter(e => e.partyId === id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => {
        if (contact.type === ContactType.CUSTOMER) {
           balance = balance + (e.debit || 0) - (e.credit || 0);
        } else {
           balance = balance + (e.credit || 0) - (e.debit || 0);
        }
        return { ...e, runningBalance: balance };
      })
      .reverse();
  }, [getContactById, ledger]);


  const mergeContacts = useCallback((primaryId: string, duplicateId: string) => {
    if (!activeCompany || primaryId === duplicateId) return false;

    const primary = allContacts.find(c => c.id === primaryId && c.companyId === activeCompany.id);
    const duplicate = allContacts.find(c => c.id === duplicateId && c.companyId === activeCompany.id);
    if (!primary || !duplicate) return false;

    const mergedTypes = Array.from(new Set([...(primary.contactTypes || []), ...(duplicate.contactTypes || [])])) as ContactCategory[];
    const merged: Contact = {
      ...primary,
      name: primary.name || duplicate.name,
      mobile: primary.mobile || duplicate.mobile,
      email: primary.email || duplicate.email,
      billingAddress: primary.billingAddress || duplicate.billingAddress,
      shippingAddress: primary.shippingAddress || duplicate.shippingAddress,
      city: primary.city || duplicate.city,
      state: primary.state || duplicate.state,
      gstNo: primary.gstNo || duplicate.gstNo,
      openingBalance: (primary.openingBalance || 0) + (duplicate.openingBalance || 0),
      contactTypes: mergedTypes.length > 0 ? mergedTypes : primary.contactTypes,
      type: mergedTypes.includes('Supplier') ? ContactType.SUPPLIER : ContactType.CUSTOMER,
    };

    setAllContacts(prev => prev
      .map(c => c.id === primaryId ? merged : c)
      .filter(c => c.id !== duplicateId)
    );
    return true;
  }, [activeCompany, allContacts]);

  return (
    <ContactContext.Provider value={{ 
      contacts, addContact, updateContact, bulkImportContacts, getContactById, getContactByMobile, 
      searchContacts, getContactBalance, getContactLedger, mergeContacts 
    }}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (!context) throw new Error('useContacts must be used within ContactProvider');
  return context;
};
