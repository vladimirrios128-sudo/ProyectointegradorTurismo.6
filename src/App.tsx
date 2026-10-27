/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PlacesView } from './components/PlacesView';
import { MerchantView } from './components/MerchantView';
import { AdminView } from './components/AdminView';
import { CodeViewer } from './components/CodeViewer';
import { ChatWidget } from './components/ChatWidget';
import { RbacToastContainer, ToastMessage } from './components/RbacToast';
import { UserRole, UserSession, canAccessView } from './utils/rbac';
import { ApiError, AUTH_TOKEN_KEY, AUTH_USER_KEY, clearStoredSession, fetchCurrentUser } from './utils/auth';
import { Compass, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<'index' | 'places' | 'merchant' | 'admin' | 'code'>('index');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const currentRole: UserRole = currentUser?.role || 'Turista';

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      setIsAuthLoading(false);
      return () => { isMounted = false; };
    }

    fetchCurrentUser(token)
      .then((user) => {
        if (!isMounted) return;
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        setCurrentUser(user);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearStoredSession();
        } else {
          console.error('No se pudo validar la sesión con el servidor.', error);
          const toast: ToastMessage = {
            id: Math.random().toString(36).substring(2, 9),
            title: 'No se pudo validar la sesión',
            message: error instanceof Error ? error.message : 'Verifica la conexión e inténtalo de nuevo.',
            isWarning: true,
          };
          setToasts((previous) => [...previous, toast]);
        }
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const addToast = (title: string, message: string, isWarning = false) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      isWarning,
    };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Interceptor de navegación RBAC estricto
  const handleNavigate = (view: 'index' | 'places' | 'merchant' | 'admin' | 'code') => {
    if (!currentUser && (view === 'merchant' || view === 'admin')) {
      addToast('Inicia sesión para continuar', 'Esta sección requiere una cuenta con el rol autorizado.', true);
      return;
    }

    const check = canAccessView(currentRole, view, currentUser?.permisos);
    if (!check.allowed) {
      addToast('Acceso Denegado (RBAC Guard)', check.reason || 'Permisos insuficientes.', false);
      return;
    }

    setActiveView(view);
  };

  const handleAuthenticated = (token: string, user: UserSession) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthLoading(false);
    addToast('Sesión iniciada', `Bienvenido/a, ${user.fullName}.`, false);
  };

  const handleLogout = () => {
    clearStoredSession();
    setCurrentUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0c1017] text-[#F8F6F0] selection:bg-[#E67E22] selection:text-white flex flex-col font-sans">
      {/* Navegación Superior */}
      <Navbar
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        onAuthenticated={handleAuthenticated}
        onLogout={handleLogout}
        activeView={activeView}
        onNavigate={handleNavigate}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {activeView === 'index' && (
          <HomeView
            onNavigate={handleNavigate}
            onTriggerAlert={addToast}
          />
        )}
        {activeView === 'places' && (
          <PlacesView
            currentRole={currentRole}
            onTriggerAlert={addToast}
          />
        )}
        {activeView === 'merchant' && (
          <MerchantView
            currentRole={currentRole}
            permissions={currentUser?.permisos}
            onNavigate={handleNavigate}
            onTriggerAlert={addToast}
          />
        )}
        {activeView === 'admin' && (
          <AdminView
            currentRole={currentRole}
            permissions={currentUser?.permisos}
            onNavigate={handleNavigate}
            onTriggerAlert={addToast}
          />
        )}
        {activeView === 'code' && (
          <CodeViewer
            currentRole={currentUser?.role || 'Turista'}
            permissions={currentUser?.permisos}
          />
        )}
      </main>

      {/* Footer Minimalista y Cultural */}
      <footer className="border-t border-white/10 bg-[#0c1017]/80 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#E67E22] flex items-center justify-center text-white">
              <Compass className="w-3 h-3" />
            </div>
            <span className="font-semibold text-neutral-200">Turismo Inteligente - Colombia</span>
            <span>·</span>
            <span>Seguridad Estricta de Roles (RBAC)</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-neutral-500">FastAPI &amp; Python · React · Vite</span>
            <span className="inline-flex items-center gap-1 text-[#10B981]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC Activo</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Alertas RBAC Flotantes */}
      <RbacToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Chatbot Guía Turístico Inteligente Gemini */}
      <ChatWidget />
    </div>
  );
}
