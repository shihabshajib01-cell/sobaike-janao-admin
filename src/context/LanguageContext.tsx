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
    createRoleTitle: string;
    createRoleSubtitle: string;
    step1Title: string;
    step1Description: string;
    step2Title: string;
    step2Description: string;
    step3Title: string;
    step3Description: string;
    enterRoleName: string;
    roleNamePlaceholder: string;
    roleNameRequired: string;
    roleNameHelper: string;
    descriptionLabel: string;
    descriptionOptional: string;
    descriptionPlaceholder: string;
    statusActiveDesc: string;
    statusInactiveDesc: string;
    selectAll: string;
    clearAll: string;
    selectedCount: string;
    permissionsCount: string;
    noPermissionsWarning: string;
    rolesManageWarning: string;
    reviewRoleDetails: string;
    reviewPermissions: string;
    submitting: string;
    roleCreatedSuccess: string;
    duplicateNameError: string;
    permissionDeniedCreate: string;
    generalCreateError: string;
    loadPermissionsError: string;
    cancelConfirmTitle: string;
    cancelConfirmMessage: string;
    keepEditing: string;
    discardAndLeave: string;
    edit: string;
    next: string;
    back: string;
    cancel: string;
    moduleDashboard: string;
    moduleComplaints: string;
    moduleCategories: string;
    moduleMap: string;
    moduleLocationActivity: string;
    moduleResponses: string;
    moduleAdminUsers: string;
    moduleRoles: string;
    moduleAudit: string;
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
      // Create Role Flow
      createRoleTitle: 'Create Role',
      createRoleSubtitle: 'Define a new administrative role and assign its system permissions.',
      step1Title: 'Role Details',
      step1Description: 'Define the role name and status.',
      step2Title: 'Permissions',
      step2Description: 'Assign system access permissions to this administrative role.',
      step3Title: 'Review',
      step3Description: 'Review role configuration and permissions before creating.',
      enterRoleName: 'Enter role name',
      roleNamePlaceholder: 'Enter role name',
      roleNameRequired: 'Role name is required and cannot be blank.',
      roleNameHelper: 'A clear, descriptive name for this administrative role.',
      descriptionLabel: 'Description',
      descriptionOptional: 'Description (Optional)',
      descriptionPlaceholder: 'Add an optional description',
      statusActiveDesc: 'Users assigned to this role can immediately exercise its permissions.',
      statusInactiveDesc: 'Role is disabled. Users assigned will not inherit its permissions until activated.',
      selectAll: 'Select All',
      clearAll: 'Clear All',
      selectedCount: '{count} selected',
      permissionsCount: '{count} of {total} permissions selected',
      noPermissionsWarning: 'No permissions selected. This role will not be able to access permission-controlled features.',
      rolesManageWarning: 'This role will not be able to manage Roles & Permissions.',
      reviewRoleDetails: 'Role Details',
      reviewPermissions: 'Permissions',
      submitting: 'Creating Role...',
      roleCreatedSuccess: 'Role created successfully.',
      duplicateNameError: 'A role with this name already exists.',
      permissionDeniedCreate: 'You do not have permission to manage Roles & Permissions.',
      generalCreateError: 'Failed to create role. Please check your connection and retry.',
      loadPermissionsError: 'Could not load permissions catalogue. Please check your connection and retry.',
      cancelConfirmTitle: 'Discard changes?',
      cancelConfirmMessage: 'You have unsaved changes in this role. Leaving will discard all entered details.',
      keepEditing: 'Keep Editing',
      discardAndLeave: 'Discard and Leave',
      edit: 'Edit',
      next: 'Next',
      back: 'Back',
      cancel: 'Cancel',
      moduleDashboard: 'Dashboard',
      moduleComplaints: 'Complaints',
      moduleCategories: 'Categories',
      moduleMap: 'Map Monitoring',
      moduleLocationActivity: 'Location Activity',
      moduleResponses: 'Responses',
      moduleAdminUsers: 'User Management',
      moduleRoles: 'Roles & Permissions',
      moduleAudit: 'Audit',
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
      // Create Role Flow
      createRoleTitle: 'ভূমিকা তৈরি করুন',
      createRoleSubtitle: 'একটি নতুন প্রশাসনিক ভূমিকা সংজ্ঞায়িত করুন এবং এর সিস্টেমের অনুমতি নির্ধারণ করুন।',
      step1Title: 'ভূমিকার বিবরণ',
      step1Description: 'ভূমিকার নাম এবং স্ট্যাটাস নির্ধারণ করুন।',
      step2Title: 'অনুমতিসমূহ',
      step2Description: 'এই প্রশাসনিক ভূমিকায় সিস্টেমের প্রবেশাধিকার অনুমতি বরাদ্দ করুন।',
      step3Title: 'পর্যালোচনা',
      step3Description: 'তৈরি করার আগে ভূমিকার কনফিগারেশন এবং অনুমতি পর্যালোচনা করুন।',
      enterRoleName: 'ভূমিকার নাম লিখুন',
      roleNamePlaceholder: 'ভূমিকার নাম লিখুন',
      roleNameRequired: 'ভূমিকার নাম আবশ্যক এবং ফাঁকা রাখা যাবে না।',
      roleNameHelper: 'এই প্রশাসনিক ভূমিকার জন্য একটি স্পষ্ট ও বর্ণনামূলক নাম।',
      descriptionLabel: 'বিবরণ',
      descriptionOptional: 'বিবরণ (ঐচ্ছিক)',
      descriptionPlaceholder: 'একটি ঐচ্ছিক বিবরণ যুক্ত করুন',
      statusActiveDesc: 'এই ভূমিকায় বরাদ্দকৃত ব্যবহারকারীরা অবিলম্বে এর অনুমতি ব্যবহার করতে পারবেন।',
      statusInactiveDesc: 'ভূমিকাটি নিষ্ক্রিয়। সক্রিয় না করা পর্যন্ত বরাদ্দকৃত ব্যবহারকারীরা এর অনুমতি পাবেন না।',
      selectAll: 'সব নির্বাচন করুন',
      clearAll: 'সব মুছুন',
      selectedCount: '{count} টি নির্বাচিত',
      permissionsCount: '{total} টির মধ্যে {count} টি অনুমতি নির্বাচিত',
      noPermissionsWarning: 'কোনো অনুমতি নির্বাচন করা হয়নি। এই ভূমিকাটি কোনো সুরক্ষিত বৈশিষ্ট্যে প্রবেশ করতে পারবে না।',
      rolesManageWarning: 'এই ভূমিকাটি ভূমিকা ও অনুমতি পরিচালনা করতে পারবে না।',
      reviewRoleDetails: 'ভূমিকার বিবরণ',
      reviewPermissions: 'অনুমতিসমূহ',
      submitting: 'ভূমিকা তৈরি করা হচ্ছে...',
      roleCreatedSuccess: 'ভূমিকা সফলভাবে তৈরি হয়েছে।',
      duplicateNameError: 'এই নামের একটি ভূমিকা ইতিমধ্যে বিদ্যমান।',
      permissionDeniedCreate: 'ভূমিকা ও অনুমতি পরিচালনা করার অনুমতি আপনার নেই।',
      generalCreateError: 'ভূমিকা তৈরি করতে ব্যর্থ হয়েছে। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
      loadPermissionsError: 'অনুমতি তালিকা লোড করা যায়নি। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
      cancelConfirmTitle: 'পরিবর্তন বাতিল করবেন?',
      cancelConfirmMessage: 'আপনার ভূমিকায় অসংরক্ষিত পরিবর্তন রয়েছে। ফিরে গেলে সমস্ত তথ্য মুছে যাবে।',
      keepEditing: 'সম্পাদনা চালিয়ে যান',
      discardAndLeave: 'বাতিল করে ফিরে যান',
      edit: 'সম্পাদনা',
      next: 'পরবর্তী',
      back: 'পূর্ববর্তী',
      cancel: 'বাতিল',
      moduleDashboard: 'ড্যাশবোর্ড',
      moduleComplaints: 'অভিযোগসমূহ',
      moduleCategories: 'বিভাগসমূহ',
      moduleMap: 'ম্যাপ মনিটরিং',
      moduleLocationActivity: 'লোকেশন অ্যাক্টিভিটি',
      moduleResponses: 'প্রতিক্রিয়া',
      moduleAdminUsers: 'ব্যবহারকারী পরিচালনা',
      moduleRoles: 'ভূমিকা ও অনুমতি',
      moduleAudit: 'অডিট',
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
