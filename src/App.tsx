import React from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from '@/themes';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/common';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <LanguageProvider>
          <AuthProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
