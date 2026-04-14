/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import VipDashboard from './pages/VipDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import { AppProvider, useAppContext } from './context/AppContext';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: 'admin' | 'vip' }) => {
  const { user } = useAppContext();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/vip" 
            element={
              <ProtectedRoute allowedRole="vip">
                <VipDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
