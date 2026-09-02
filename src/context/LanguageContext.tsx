import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'bn';

export interface TranslationDictionary {
  nav: {
    dashboard: string;
    complaints: string;
    responses: string;
    categories: string;
    map: string;
    locationActivity: string;
  };
  header: {
    searchPlaceholder: string;
    notifications: string;
    themeToggle: string;
    profile: string;
    superadmin: string;
    operator: string;
    signOut: string;
    systemStatus: string;
    operational: string;
  };
  common: {
    back: string;
    refresh: string;
    filter: string;
    export: string;
    search: string;
    actions: string;
    status: string;
    viewDetails: string;
    close: string;
    save: string;
    cancel: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      complaints: 'Complaints',
      responses: 'Responses',
      categories: 'Categories',
      map: 'Map Monitoring',
      locationActivity: 'Location Activity',
    },
    header: {
      searchPlaceholder: 'Search complaints, IDs, wards...',
      notifications: 'Notifications',
      themeToggle: 'Toggle theme',
      profile: 'Admin Profile',
      superadmin: 'Superadmin',
      operator: 'Admin Operator',
      signOut: 'Sign Out',
      systemStatus: 'System Status',
      operational: 'Operational',
    },
    common: {
      back: 'Back',
      refresh: 'Refresh',
      filter: 'Filter',
      export: 'Export',
      search: 'Search',
      actions: 'Actions',
      status: 'Status',
      viewDetails: 'View Details',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
    },
  },
  bn: {
    nav: {
      dashboard: 'ড্যাশবোর্ড',
      complaints: 'অভিযোগসমূহ',
      responses: 'প্রতিক্রিয়া',
      categories: 'বিভাগসমূহ',
      map: 'ম্যাপ মনিটরিং',
      locationActivity: 'লোকেশন অ্যাক্টিভিটি',
    },
    header: {
      searchPlaceholder: 'অভিযোগ, আইডি, ওয়ার্ড অনুসন্ধান করুন...',
      notifications: 'বিজ্ঞপ্তি',
      themeToggle: 'থিম পরিবর্তন',
      profile: 'অ্যাডমিন প্রোফাইল',
      superadmin: 'সুপার অ্যাডমিন',
      operator: 'অ্যাডমিন অপারেটর',
      signOut: 'লগ আউট',
      systemStatus: 'সিস্টেম স্ট্যাটাস',
      operational: 'সক্রিয়',
    },
    common: {
      back: 'পিছনে যান',
      refresh: 'রিফ্রেশ',
      filter: 'ফিল্টার',
      export: 'এক্সপোর্ট',
      search: 'অনুসন্ধান',
      actions: 'পদক্ষেপ',
      status: 'অবস্থা',
      viewDetails: 'বিস্তারিত দেখুন',
      close: 'বন্ধ করুন',
      save: 'সংরক্ষণ',
      cancel: 'বাতিল',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'sobaike_admin_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'bn') return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
