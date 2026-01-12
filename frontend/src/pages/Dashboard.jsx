import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  FileText,
  Edit,
  Shield,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [graficoSemanal, setGraficoSemanal] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarDados, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      const data = response?.data?.data;

      if (!data) {
        setStats(null);
        setGraficoSemanal([]);
        setAtividades([]);
        return;
      }

      
      setStats({
        presentes: data.presentes,
        ausencias: data.ausencias,
        sem_saida: data.sem_saida,
        alertas: data.alertas
      });
      
      setGraficoSemanal(Array.isArray(data.grafico_semanal) ? data.grafico_semanal : []);
      setAtividades(Array.isArray(data.atividades_recentes) ? data.atividades_recentes : []);

      
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dados do gráfico de pizza
  const pieData = [
    { name: 'Presentes', value: stats?.presentes || 0, color: '#10b981' },
    { name: 'Ausentes', value: stats?.ausencias || 0, color: '#ef4444' },
    { name: 'Sem Saída', value: stats?.sem_saida || 0, color: '#f59e0b' }
  ];

  const quickActions = [
    {
      icon: Clock,
      label: 'Ver Registros',
      description: 'Registros de hoje',
      path: '/registros',
      color: 'blue'
    },
    {
      icon: Users,
      label: 'Funcionários',
      description: 'Gerenciar equipe',
      path: '/usuarios',
      color: 'purple'
    },
    {
      icon: TrendingUp,
      label: 'Banco de Horas',
      description: 'Saldos e balanços',
      path: '/banco-horas',
      color: 'green'
    },
    {
      icon: FileText,
      label: 'Justificativas',
      description: 'Faltas e atestados',
      path: '/justificativas',
      color: 'yellow'
    },
    {
      icon: Edit,
      label: 'Ajustes',
      description: 'Correções manuais',
      path: '/ajustes',
      color: 'red'
    },
    {
      icon: Calendar,
      label: 'Relatórios',
      description: 'Análises mensais',
      path: '/relatorio-mensal',
      color: 'blue'
    }
  ];

  const getActivityTypeColor = (tipo) => {
    return tipo === 'plantonista' ? 'bg-blue-500' : 'bg-emerald-500';
  };

  const getActivityBadgeColor = (tipo) => {
    return tipo === 'plantonista' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700';
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Dashboard" 
      subtitle={`Bem-vindo de volta! Aqui está o resumo de hoje.`}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Presentes Hoje"
          value={stats?.presentes || 0}
          icon={CheckCircle2}
          color="green"
          trend="up"
          trendValue="+12%"
          delay={0}
        />
        <StatCard
          title="Ausências"
          value={stats?.ausencias || 0}
          icon={XCircle}
          color="red"
          trend="down"
          trendValue="-5%"
          delay={0.1}
        />
        <StatCard
          title="Sem Saída"
          value={stats?.sem_saida || 0}
          icon={Clock}
          color="yellow"
          delay={0.2}
        />
        <StatCard
          title="Alertas"
          value={stats?.alertas || 0}
          icon={AlertCircle}
          color="purple"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de Área - Presença Semanal */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Presença Semanal</h3>
              <p className="text-sm text-slate-500">Últimos 7 dias</p>
            </div>
            <Badge variant="info">Atualizado agora</Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={graficoSemanal}>
              <defs>
                <linearGradient id="colorPresentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAusentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dia" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="presentes"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPresentes)"
                name="Presentes"
              />
              <Area
                type="monotone"
                dataKey="ausentes"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAusentes)"
                name="Ausentes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico de Pizza - Distribuição */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Hoje</h3>
            <p className="text-sm text-slate-500">Distribuição atual</p>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-4">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={idx}
                onClick={() => navigate(action.path)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`
                      p-3 rounded-xl 
                      ${action.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                      ${action.color === 'purple' ? 'bg-purple-50 text-purple-600' : ''}
                      ${action.color === 'green' ? 'bg-emerald-50 text-emerald-600' : ''}
                      ${action.color === 'yellow' ? 'bg-amber-50 text-amber-600' : ''}
                      ${action.color === 'red' ? 'bg-red-50 text-red-600' : ''}
                    `}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">{action.label}</h4>
                      <p className="text-sm text-slate-500">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Activity Feed */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Atividades Recentes</h3>
              <p className="text-sm text-slate-500">Últimas movimentações do sistema</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/registros')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas
          </button>
        </div>

        <div className="space-y-3">
          {atividades?.length > 0 ? (
            atividades.map((atividade, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${getActivityTypeColor(atividade.tipo)}`} />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-slate-900">{atividade.usuario}</span>
                    {' '}
                    <span className="text-slate-600">{atividade.acao}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400">{atividade.tempo_relativo}</p>
                    {atividade.tipo === 'plantonista' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getActivityBadgeColor(atividade.tipo)}`}>
                        📋 Plantonista
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
}