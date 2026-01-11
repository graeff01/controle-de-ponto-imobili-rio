import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Clock, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ matricula: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.matricula, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Clock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Sistema de Ponto</h1>
            <p className="text-slate-600">Acesso ao Painel Administrativo</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Matrícula */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-slate-900 bg-white"
                  placeholder="Digite sua matrícula"
                  required
                  autoFocus
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-slate-900 bg-white pr-12"
                    placeholder="Digite sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-3.5 rounded-lg font-semibold text-base transition-all flex items-center justify-center gap-2
                  ${loading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Entrar no Sistema
                  </>
                )}
              </button>

              {/* Links */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="w-full text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                  Esqueceu sua senha?
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm transition-colors"
                >
                  ← Voltar para registro de ponto
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-6">
            © 2025 Sistema de Controle de Ponto. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>

      {/* Right Side - Brand/Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12 relative overflow-hidden">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 text-center max-w-lg">
          <Building2 className="text-white mx-auto mb-6" size={64} />
          <h2 className="text-4xl font-bold text-white mb-4">
            Gestão de Ponto Profissional
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            Controle completo de jornada de trabalho com tecnologia moderna e segura.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-1">100%</div>
              <div className="text-slate-400 text-sm">Digital</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-slate-400 text-sm">Disponível</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">Seguro</div>
              <div className="text-slate-400 text-sm">Criptografado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}