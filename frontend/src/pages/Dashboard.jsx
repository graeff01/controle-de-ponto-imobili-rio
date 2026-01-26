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
  XCircle,
  MapPin
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext'; // ✅ Novo
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
  const { user } = useAuth(); // ✅ Novo
  const [stats, setStats] = useState(null);
  const [graficoSemanal, setGraficoSemanal] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [analytics, setAnalytics] = useState(null); // ✅ Novo
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

      // ✅ Carregar Analytics RH se permitido
      if (user?.role === 'admin' || user?.role === 'gestor') {
        try {
          const [absenteismoRes, overtimeRes] = await Promise.all([
            api.get('/reports/stats/absenteismo'),
            api.get('/reports/stats/overtime')
          ]);
          setAnalytics({
            absenteismo: absenteismoRes.data.data,
            overtime: overtimeRes.data.data
          });
        } catch (e) {
          console.error('Erro loading analytics', e);
        }
      }


    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const isConsultor = (u) => {
    const cargo = u?.cargo?.toLowerCase() || '';
    return cargo.includes('consultor') || cargo.includes('consutor');
  };

  const quickActions = [
    ...(isConsultor(user) ? [{
      icon: MapPin,
      label: 'Registrar Visita',
      description: 'Ponto externo com GPS',
      path: '/ponto-externo',
      color: 'emerald',
      primary: true,
      roles: ['admin', 'manager', 'funcionario', 'employee']
    }] : []),
    {
      icon: Clock,
      label: 'Meus Registros',
      description: 'Ver meu cartão de ponto',
      path: '/registros',
      color: 'blue',
      roles: ['funcionario', 'employee']
    },
    {
      icon: Clock,
      label: 'Todos os Registros',
      description: 'Registros da equipe',
      path: '/registros',
      color: 'blue',
      roles: ['admin', 'manager']
    },
    {
      icon: Users,
      label: 'Funcionários',
      description: 'Gerenciar equipe',
      path: '/usuarios',
      color: 'purple',
      roles: ['admin', 'manager']
    },
    {
      icon: TrendingUp,
      label: 'Banco de Horas',
      description: 'Saldos e balanços',
      path: '/banco-horas',
      color: 'green',
      roles: ['admin', 'manager']
    },
    {
      icon: FileText,
      label: 'Justificativas',
      description: 'Faltas e atestados',
      path: '/justificativas',
      color: 'yellow',
      roles: ['admin', 'manager']
    },
    {
      icon: Edit,
      label: 'Solicitar Ajuste',
      description: 'Correções manuais',
      path: '/ajustes',
      color: 'red',
      roles: ['admin', 'manager']
    },
    {
      icon: Calendar,
      label: 'Relatórios',
      description: 'Análises mensais',
      path: '/relatorio-mensal',
      color: 'blue',
      roles: ['admin', 'manager']
    }
  ].filter(action => !action.roles || action.roles.includes(user?.role || 'employee'));

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
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAusentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
            const isPrimary = action.primary;

            return (
              <motion.button
                key={idx}
                onClick={() => navigate(action.path)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  p-6 rounded-2xl border transition-all text-left group
                  ${isPrimary
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl md:col-span-2 lg:col-span-1'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-lg'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`
                      p-3 rounded-xl 
                      ${isPrimary ? 'bg-emerald-500 text-white' : ''}
                      ${!isPrimary && action.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                      ${!isPrimary && action.color === 'purple' ? 'bg-purple-50 text-purple-600' : ''}
                      ${!isPrimary && action.color === 'green' ? 'bg-emerald-50 text-emerald-600' : ''}
                      ${!isPrimary && action.color === 'yellow' ? 'bg-amber-50 text-amber-600' : ''}
                      ${!isPrimary && action.color === 'red' ? 'bg-red-50 text-red-600' : ''}
                    `}>
                      <Icon size={isPrimary ? 32 : 24} />
                    </div>
                    <div>
                      <h4 className={`font-semibold mb-1 ${isPrimary ? 'text-lg text-white' : 'text-slate-900'}`}>
                        {action.label}
                      </h4>
                      <p className={`text-sm ${isPrimary ? 'text-slate-300' : 'text-slate-500'}`}>
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`${isPrimary ? 'text-emerald-400' : 'text-slate-400'} group-hover:translate-x-1 transition-all`} size={24} />
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

      {/* Analytics RH (Visível apenas para Gestão) */}
      {analytics && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield size={24} className="text-purple-600" />
            Analytics de RH
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Absenteísmo */}
            <Card className="p-6 border-l-4 border-l-red-500">
              <h4 className="font-semibold text-slate-700 mb-2">Taxa de Absenteísmo (30 dias)</h4>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-slate-900">{analytics.absenteismo?.taxa_absenteismo || 0}%</span>
                <span className="text-sm text-slate-500 mb-1">do total de dias úteis</span>
              </div>
              <p className="text-sm text-slate-600">
                Total de faltas injustificadas: <strong>{analytics.absenteismo?.total_faltas || 0}</strong>
              </p>
            </Card>

            {/* Top Horas Extras */}
            <Card className="p-6 border-l-4 border-l-amber-500">
              <h4 className="font-semibold text-slate-700 mb-4">Top Horas Extras (Mês Atual)</h4>
              <div className="space-y-3">
                {analytics.overtime?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <span className="text-sm font-medium text-slate-800">{item.nome}</span>
                    <Badge variant="warning">+{item.horas_extras}h</Badge>
                  </div>
                ))}
                {analytics.overtime?.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Sem horas extras registradas.</p>
                )}
              </div>
            </Card>

          </div>
        </div>
      )}
    </Layout>
  );
}