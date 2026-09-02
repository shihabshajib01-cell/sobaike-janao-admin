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
    roles: string;
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
  roles: {
    title: string;
    description: string;
    refresh: string;
    createRole: string;
    createRoleNotAvailable: string;
    roleName: string;
    status: string;
    permissions: string;
    assignedUsers: string;
    created: string;
    active: string;
    inactive: string;
    system: string;
    emptyTitle: string;
    emptyDescription: string;
    showingTotalSingular: string;
    showingTotalPlural: string;
    permissionSingular: string;
    permissionPlural: string;
    userSingular: string;
    userPlural: string;
    createdLabel: string;
    permissionRequired: string;
    permissionDeniedMessage: string;
    failedToLoad: string;
    failedToLoadMessage: string;
    retry: string;
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
      roles: 'Roles & Permissions',
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
    roles: {
      title: 'Roles & Permissions',
      description: 'Manage administrative roles and their system permissions.',
      refresh: 'Refresh',
      createRole: 'Create Role',
      createRoleNotAvailable: 'Create Role is not available yet.',
      roleName: 'Role Name',
      status: 'Status',
      permissions: 'Permissions',
      assignedUsers: 'Assigned Users',
      created: 'Created',
      active: 'Active',
      inactive: 'Inactive',
      system: 'System',
      emptyTitle: 'No roles created yet',
      emptyDescription: 'Create roles to define which areas and actions administrators can access.',
      showingTotalSingular: 'Showing 1 total role',
      showingTotalPlural: 'Showing {count} total roles',
      permissionSingular: 'permission',
      permissionPlural: 'permissions',
      userSingular: 'user',
      userPlural: 'users',
      createdLabel: 'Created:',
      permissionRequired: 'Permission Required',
      permissionDeniedMessage: 'You do not have permission to access Roles & Permissions.',
      failedToLoad: 'Failed to load roles',
      failedToLoadMessage: 'Could not load administrative roles. Please check your connection and retry.',
      retry: 'Retry',
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
      roles: 'ভূমিকা ও অনুমতি',
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
    roles: {
      title: 'ভূমিকা ও অনুমতি',
      description: 'প্রশাসনিক ভূমিকা এবং তাদের সিস্টেমের অনুমতি পরিচালনা করুন।',
      refresh: 'রিফ্রেশ',
      createRole: 'ভূমিকা তৈরি করুন',
      createRoleNotAvailable: 'ভূমিকা তৈরি এখনো উপলভ্য নয়।',
      roleName: 'ভূমিকার নাম',
      status: 'স্ট্যাটাস',
      permissions: 'অনুমতি',
      assignedUsers: 'বরাদ্দকৃত ব্যবহারকারী',
      created: 'তৈরির তারিখ',
      active: 'সক্রিয়',
      inactive: 'নিষ্ক্রিয়',
      system: 'সিস্টেম',
      emptyTitle: 'এখনো কোনো ভূমিকা তৈরি করা হয়নি',
      emptyDescription: 'অ্যাডমিনিস্ট্রেটররা কোন ক্ষেত্র এবং কার্যকলাপে প্রবেশ করতে পারবেন তা নির্ধারণ করতে ভূমিকা তৈরি করুন।',
      showingTotalSingular: 'মোট ১ টি ভূমিকা তৈরি আছে',
      showingTotalPlural: 'মোট {count} টি ভূমিকা তৈরি আছে',
      permissionSingular: 'টি অনুমতি',
      permissionPlural: 'টি অনুমতি',
      userSingular: 'জন ব্যবহারকারী',
      userPlural: 'জন ব্যবহারকারী',
      createdLabel: 'তৈরির তারিখ:',
      permissionRequired: 'অনুমতি প্রয়োজন',
      permissionDeniedMessage: 'আপনার ভূমিকা ও অনুমতি এক্সেস করার অনুমতি নেই।',
      failedToLoad: 'ভূমিকা লোড করা যায়নি',
      failedToLoadMessage: 'প্রশাসনিক ভূমিকা লোড করা যায়নি। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।',
      retry: 'আবার চেষ্টা করুন',
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
