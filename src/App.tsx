/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { BecomeProviderPage } from './pages/BecomeProviderPage';
import { BrowseServicesPage } from './pages/BrowseServicesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { HomePage } from './pages/HomePage';
import { PostJobPage } from './pages/PostJobPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  HowItWorksPage,
  NotFoundPage,
  PolicyPage,
} from './pages/StaticPages';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-white text-[#142B4A]">
              <Header />
              <main className="flex-1">
                <Routes>
                  {/* 20 Public Marketplace Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/services" element={<BrowseServicesPage />} />
                  <Route path="/search" element={<BrowseServicesPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
                  <Route path="/professionals" element={<ProfessionalsPage />} />
                  <Route path="/providers/:id" element={<ProviderProfilePage />} />
                  <Route path="/providers/:id/services" element={<ProviderProfilePage />} />
                  <Route path="/post-job" element={<PostJobPage />} />
                  <Route path="/become-provider" element={<BecomeProviderPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/register" element={<AuthPage mode="register" />} />
                  <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
                  <Route path="/terms" element={<PolicyPage type="terms" />} />
                  <Route path="/privacy" element={<PolicyPage type="privacy" />} />
                  <Route path="/guidelines/provider" element={<PolicyPage type="provider-guidelines" />} />
                  <Route path="/guidelines/customer" element={<PolicyPage type="customer-guidelines" />} />

                  {/* Logged-in One-Account Two-Mode Dashboards & Admin Console */}
                  <Route path="/dashboard" element={<CustomerDashboard />} />
                  <Route path="/provider-dashboard" element={<ProviderDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Footer />
              <MobileBottomNav />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
