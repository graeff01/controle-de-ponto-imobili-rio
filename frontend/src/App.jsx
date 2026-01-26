import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './services/syncService';
import PontoTablet from './pages/PontoTablet';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registros from './pages/Registros';
import Usuarios from './pages/Usuarios';
import JornadaDiaria from './pages/JornadaDiaria';
import Ajustes from './pages/Ajustes';
import RelatorioMensal from './pages/RelatorioMensal';
import Justificativas from './pages/Justificativas';
import BancoHoras from './pages/BancoHoras';
import Auditoria from './pages/Auditoria';
import Feriados from './pages/Feriados'; // ✅ Novo
import Aprovacoes from './pages/Aprovacoes'; // ✅ Corrigido (sem acento)
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PontoExterno from './pages/PontoExterno';

// Componente para proteger rotas
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota pública - Tablet de registro */}
            <Route path="/" element={<PontoTablet />} />

            {/* Login do gestor */}
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas do gestor */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registros"
              element={
                <ProtectedRoute>
                  <Registros />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jornada/:userId/:date"
              element={
                <ProtectedRoute>
                  <JornadaDiaria />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ajustes"
              element={
                <ProtectedRoute>
                  <Ajustes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorio-mensal"
              element={
                <ProtectedRoute>
                  <RelatorioMensal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/justificativas"
              element={
                <ProtectedRoute>
                  <Justificativas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/banco-horas"
              element={
                <ProtectedRoute>
                  <BancoHoras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auditoria"
              element={
                <ProtectedRoute>
                  <Auditoria />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feriados"
              element={
                <ProtectedRoute>
                  <Feriados />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aprovacoes"
              element={
                <ProtectedRoute>
                  <Aprovacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ponto-externo"
              element={
                <ProtectedRoute>
                  <PontoExterno />
                </ProtectedRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Routes>
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
}

export default App;