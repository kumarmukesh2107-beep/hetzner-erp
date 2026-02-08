
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PrintTemplate, PrintSettings } from '../types';
import { useCompany } from './CompanyContext';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface SettingsContextType {
  templates: PrintTemplate[];
  updateTemplate: (id: string, settings: Partial<PrintSettings>) => void;
  getTemplate: (id: string) => PrintTemplate | undefined;
  includeMigratedInData: boolean;
  setIncludeMigratedInData: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
const SETTINGS_STORAGE_KEY = 'nexus_settings_state_v1';

const DEFAULT_SETTINGS: PrintSettings = {
  primaryColor: '#4f46e5',
  accentColor: '#1e293b',
  showHeaderLogo: true,
  showBankDetails: true,
  showTerms: true,
  showSignatures: true,
  headerAlignment: 'left',
  footerNotes: 'Thank you for your business!',
  signatureLabels: {
    left: 'Client Signature',
    right: 'Authorized Signatory'
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompany } = useCompany();
  const [includeMigratedInData, setIncludeMigratedInData] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  
  const [templates, setTemplates] = useState<PrintTemplate[]>([
    {
      id: 'std-doc',
      name: 'Standard ERP Document',
      description: 'Default layout for Invoices, Quotations, and POs.',
      settings: DEFAULT_SETTINGS
    },
    {
      id: 'ready-items',
      name: 'Ready Items Template',
      description: 'Print with "READY ITEMS ORDER" branding for stock items.',
      settings: { ...DEFAULT_SETTINGS, accentColor: '#10b981' }
    },
    {
      id: 'made-to-order',
      name: 'Made to Order Template',
      description: 'Print with "MADE TO ORDER" branding for custom items.',
      settings: { ...DEFAULT_SETTINGS, accentColor: '#f59e0b' }
    },
    {
        id: 'compact-inv',
        name: 'Compact Retail Invoice',
        description: 'Simplified layout optimized for thermal printers.',
        settings: { ...DEFAULT_SETTINGS, showTerms: false, showBankDetails: false }
    }
  ]);


  useEffect(() => {
    const companyId = activeCompany?.id || 'global';
    const saved = loadLocalState<any | null>(`${SETTINGS_STORAGE_KEY}_${companyId}`, null);
    if (saved) {
      if (Array.isArray(saved.templates)) setTemplates(saved.templates);
      if (typeof saved.includeMigratedInData === 'boolean') setIncludeMigratedInData(saved.includeMigratedInData);
    }
    setSettingsHydrated(true);
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!settingsHydrated) return;
    const companyId = activeCompany?.id || 'global';
    saveLocalState(`${SETTINGS_STORAGE_KEY}_${companyId}`, { templates, includeMigratedInData });
  }, [templates, includeMigratedInData, activeCompany?.id, settingsHydrated]);

  const updateTemplate = (id: string, newSettings: Partial<PrintSettings>) => {
    setTemplates(prev => prev.map(t => 
      t.id === id ? { ...t, settings: { ...t.settings, ...newSettings } } : t
    ));
  };

  const getTemplate = (id: string) => templates.find(t => t.id === id);

  return (
    <SettingsContext.Provider value={{ 
      templates, 
      updateTemplate, 
      getTemplate, 
      includeMigratedInData, 
      setIncludeMigratedInData 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings missing provider');
  return context;
};
