import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  MapPin,
  Briefcase,
  History,
  AlertTriangle,
  Zap
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
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
      if (response?.data?.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: MapPin,
      label: 'Novo Registro',
      description: 'Ponto com geolocalização',
      path: '/ponto-externo',
      color: 'blue',
      roles: ['admin', 'manager', 'funcionario', 'employee']
    },
    {
      icon: History,
      label: 'Minha Jornada',
      description: 'Consultar extrato mensal',
      path: '/registros',
      color: 'slate',
      roles: ['funcionario', 'employee']
    },
    {
      icon: Users,
      label: 'Equipe Auxiliadora',
      description: 'Gerenciar colaboradores',
      path: '/usuarios',
      color: 'indigo',
      roles: ['admin', 'manager']
    },
    {
      icon: TrendingUp,
      label: 'Banco de Horas',
      description: 'Saldos acumulados',
      path: '/banco-horas',
      color: 'emerald',
      roles: ['admin', 'manager']
    },
    {
      icon: AlertTriangle,
      label: 'Ajustes Pendentes',
      description: 'Correções de batida',
      path: '/ajustes',
      color: 'rose',
      roles: ['admin', 'manager']
    },
    {
      icon: FileText,
      label: 'Relatórios',
      description: 'Exportar fechamentos',
      path: '/relatorio-mensal',
      color: 'sky',
      roles: ['admin', 'manager']
    }
  ].filter(action => !action.roles || action.roles.includes(user?.role || 'employee'));

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full"
          />
          <p className="text-slate-400 text-sm font-medium">Preparando seu painel...</p>
        </div>
      </Layout>
    );
  }

  const clt = data?.clt || {};
  const pj = data?.pj || {};
  const analytics = data?.analytics || {};

  return (
    <Layout
      title="Visão Geral"
      subtitle={`Bem-vindo, ${user?.nome?.split(' ')[0]}.`}
    >
      <div className="space-y-8 pb-12">

        {/* Top Segment: Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Presença CLT"
            value={clt.presentes || 0}
            icon={Users}
            color="blue"
            trend="up"
            trendValue={`${Math.round((clt.presentes / clt.total) * 100) || 0}%`}
            delay={0}
          />
          <StatCard
            title="Plantão PJ"
            value={pj.presentes || 0}
            icon={MapPin}
            color="green"
            trend="up"
            trendValue={`${Math.round((pj.presentes / pj.total) * 100) || 0}%`}
            delay={0.1}
          />
          <StatCard
            title="Inconsistências"
            value={analytics.inconsistencias || 0}
            icon={AlertCircle}
            color="rose"
            trend={analytics.inconsistencias > 0 ? "down" : "up"}
            trendValue="Crítico"
            delay={0.2}
          />
          <StatCard
            title="Banco (Crédito)"
            value={`${analytics.banco_horas?.credito || 0}h`}
            icon={TrendingUp}
            color="emerald"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Visual: Weekly Flow */}
          <div className="lg:col-span-2">
            <Card className="p-8 border-none shadow-premium bg-white group h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Fluxo de Presença</h3>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Atividade nos últimos 7 dias</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold text-slate-600">Presentes</span>
                  </div>
                </div>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.grafico_semanal || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dia"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        padding: '12px 16px'
                      }}
                      itemStyle={{ fontWeight: 700, fontSize: '13px' }}
                      labelStyle={{ marginBottom: '4px', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="presentes"
                      stroke="#0f172a"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorFill)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Right Column: Operational Balance */}
          <div className="space-y-8">
            <Card className="p-8 border-none shadow-premium bg-white h-full">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6">Balance Operacional</h3>

              <div className="space-y-6">
                {/* CLT Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipe CLT</span>
                      <p className="text-sm font-bold text-slate-900">{clt.presentes} ativos hoje</p>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{Math.round((clt.presentes / clt.total) * 100) || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(clt.presentes / clt.total) * 100 || 0}%` }}
                      className="h-full bg-slate-900"
                    />
                  </div>
                </div>

                {/* PJ Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plantonistas PJ</span>
                      <p className="text-sm font-bold text-slate-900">{pj.presentes} em escala</p>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{Math.round((pj.presentes / pj.total) * 100) || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(pj.presentes / pj.total) * 100 || 0}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>

                {/* BH Summary */}
                <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Zap size={16} className="text-amber-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Resumo Financeiro</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Débito Total</p>
                      <p className="text-lg font-bold text-rose-500">-{analytics.banco_horas?.debito || 0}h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Crédito Total</p>
                      <p className="text-lg font-bold text-emerald-500">+{analytics.banco_horas?.credito || 0}h</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Atalhos Rápidos</h3>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all text-left shadow-sm"
                >
                  <div className={`
                      p-2.5 rounded-xl 
                      ${action.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                      ${action.color === 'slate' ? 'bg-slate-100 text-slate-600' : ''}
                      ${action.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : ''}
                      ${action.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : ''}
                      ${action.color === 'rose' ? 'bg-rose-50 text-rose-600' : ''}
                      ${action.color === 'sky' ? 'bg-sky-50 text-sky-600' : ''}
                    `}>
                    <action.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{action.label}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{action.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="lg:col-span-3">
            <Card className="p-8 border-none shadow-premium bg-white">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <Activity className="text-white" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Movimentações Recentes</h3>
                </div>
                <Badge variant="default" className="bg-slate-100 text-slate-500 border-none">Live Feed</Badge>
              </div>

              <div className="space-y-4">
                {data?.atividades_recentes?.length > 0 ? (
                  data.atividades_recentes.map((atividade, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl hover:border-slate-100 hover:bg-slate-50/50 transition-all"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${atividade.tipo === 'plantonista' ? 'bg-blue-100 text-blue-600' : 'bg-slate-900 text-white'
                        }`}>
                        {atividade.usuario.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-slate-600">
                            <span className="font-bold text-slate-900">{atividade.usuario}</span>
                            {' '}
                            {atividade.acao}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{atividade.tempo_relativo}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {atividade.tipo === 'plantonista' ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] py-0">Plantonista PJ</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0 uppercase">Operação CLT</Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Clock size={40} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-semibold">Sem movimentações nas últimas 24h</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}