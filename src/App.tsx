import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import Applications from './components/Applications';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/auth" element={
            <PublicRoute>
              <AuthForm />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="applications" element={<Applications />} />
            <Route path="resume" element={<div className="text-center py-12"><h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1><p className="text-gray-600 mt-4">Coming soon...</p></div>} />
            <Route path="resources" element={<div className="text-center py-12"><h1 className="text-2xl font-bold text-gray-900">Career Resources</h1><p className="text-gray-600 mt-4">Coming soon...</p></div>} />
            <Route path="network" element={<div className="text-center py-12"><h1 className="text-2xl font-bold text-gray-900">Network</h1><p className="text-gray-600 mt-4">Coming soon...</p></div>} />
            <Route path="analytics" element={<div className="text-center py-12"><h1 className="text-2xl font-bold text-gray-900">Analytics</h1><p className="text-gray-600 mt-4">Coming soon...</p></div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;