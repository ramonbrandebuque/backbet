import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Filter, TrendingUp, Target, BarChart3, LogOut, Clock, CheckCircle2, User as UserIcon, X } from 'lucide-react';
import { calculateProfit } from '../data/mockData';
import { Strategy } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { formatNumberBR } from '../utils/format';

export default function VipDashboard() {
  const { user, logout, bets, multiBets, updateUser } = useAppContext();
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisMonth' | 'thisYear' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const strategies: Strategy[] = [
    'Mais de 0,5 Gols Casa',
    'Múltipla Mais de 0,5 Gols Casa',
    'Mais de 1,5 Gols Casa',
    'Múltipla Mais de 1,5 Gols Casa',
    'Mais de 1,5 Gols',
    'Múltipla Mais de 1,5 Gols',
    'Mais de 2,5 Gols',
    'Múltipla Mais de 2,5 Gols',
    'Abaixo de 4,5 Gols',
    'Vitoria Casa'
  ];

  const allBets = useMemo(() => {
    const mappedMultiBets = multiBets.map(mb => ({
      id: mb.id,
      date: mb.date,
      match: mb.games.map(g => g.match).join(' + '),
      strategy: mb.strategy,
      odd: mb.finalOdd,
      result: mb.result,
      isMulti: true
    }));
    
    return [...bets, ...mappedMultiBets].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [bets, multiBets]);

  const handleLogout = () => {
    navigate('/');
    // Use a small timeout to ensure navigation happens before context state updates and triggers ProtectedRoute redirect
    setTimeout(() => {
      logout();
    }, 0);
  };

  const handleSaveProfile = async () => {
    if (isSavingProfile) return;
    
    setProfileError('');
    setProfileSuccess('');

    if (!user) return;

    // If trying to change password
    if (newPassword) {
      if (!currentPassword) {
        setProfileError('Digite a senha atual para alterar a senha.');
        return;
      }
      if (currentPassword !== user.password) {
        setProfileError('Senha atual incorreta.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setProfileError('A nova senha e a confirmação não coincidem.');
        return;
      }
    }

    setIsSavingProfile(true);

    try {
      const updatedUser = {
        ...user,
        displayName: profileDisplayName,
        ...(newPassword ? { password: newPassword } : {})
      };

      await updateUser(updatedUser);
      setProfileSuccess('Perfil atualizado com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccess('');
      }, 2000);
    } catch (err) {
      setProfileError('Erro ao atualizar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const pendingBets = useMemo(() => {
    return allBets.filter(bet => bet.result === 'pending');
  }, [allBets]);

  const filteredBets = useMemo(() => {
    return allBets.filter(bet => {
      // Strategy Filter
      if (selectedStrategy !== 'All' && bet.strategy !== selectedStrategy) {
        return false;
      }

      // Date Filter
      if (!bet.date) return false;
      const betDate = parseISO(bet.date);
      const today = new Date();

      if (dateFilter === 'thisMonth') {
        if (!isWithinInterval(betDate, { start: startOfMonth(today), end: endOfMonth(today) })) return false;
      } else if (dateFilter === 'thisYear') {
        if (!isWithinInterval(betDate, { start: startOfYear(today), end: endOfYear(today) })) return false;
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        if (!isWithinInterval(betDate, { start: parseISO(customStartDate), end: parseISO(customEndDate) })) return false;
      }

      return true;
    });
  }, [allBets, selectedStrategy, dateFilter, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;
    let totalProfit = 0;
    let resolvedBetsCount = 0;

    const strategyProfitMap = new Map<string, number>();

    filteredBets.forEach(bet => {
      if (bet.result === 'pending') return;
      
      resolvedBetsCount++;
      if (bet.result === 'win') totalWins++;
      else if (bet.result === 'lose') totalLosses++;
      
      const profit = calculateProfit(bet);
      totalProfit += profit;

      const currentStrategyProfit = strategyProfitMap.get(bet.strategy) || 0;
      strategyProfitMap.set(bet.strategy, currentStrategyProfit + profit);
    });

    const winRate = resolvedBetsCount > 0 ? (totalWins / resolvedBetsCount) * 100 : 0;

    // Chart Data - Cumulative Profit (only resolved bets)
    const resolvedBets = [...filteredBets].filter(b => b.result !== 'pending').reverse();
    let cumulative = 0;
    const chartData = resolvedBets.map((bet, index) => {
      cumulative += calculateProfit(bet);
      return {
        date: bet.date ? format(parseISO(bet.date), 'dd/MM/yy') : '',
        profit: cumulative
      };
    });

    // Chart Data - Profit by Strategy
    const strategyChartData = Array.from(strategyProfitMap.entries()).map(([name, profit]) => ({
      name,
      profit
    })).sort((a, b) => b.profit - a.profit);

    return {
      totalBets: resolvedBetsCount,
      winRate,
      totalProfit,
      chartData,
      strategyChartData
    };
  }, [filteredBets]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              <span className="text-xl font-bold tracking-tight">Dashboard VIP</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-sm text-slate-400">Olá, {user?.displayName || user?.username}</span>
              <button 
                onClick={() => {
                  setProfileDisplayName(user?.displayName || '');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setProfileError('');
                  setProfileSuccess('');
                  setIsProfileModalOpen(true);
                }} 
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-emerald-400 transition-colors" 
                title="Meu Perfil"
              >
                <UserIcon className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        
        {/* Pending Bets Section */}
        {pendingBets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-400">
              <Clock className="w-6 h-6" /> Dicas Futuras (Pendentes)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingBets.map(bet => (
                <div key={bet.id} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    AGUARDANDO
                  </div>
                  <div className="text-sm text-slate-400 mb-1">{bet.date ? format(parseISO(bet.date), 'dd/MM/yyyy') : ''}</div>
                  <div className="font-bold text-lg mb-2">{bet.match}</div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                    <span className="text-slate-300 text-sm">{bet.strategy}</span>
                    <span className="bg-slate-800 px-3 py-1 rounded-lg font-mono text-emerald-400 font-bold">Odd: {formatNumberBR(bet.odd, 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Resolved Bets */}
        {(() => {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const todaysResolvedBets = allBets.filter(b => b.date === todayStr && b.result !== 'pending');
          
          if (todaysResolvedBets.length === 0) return null;

          const todayWins = todaysResolvedBets.filter(b => b.result === 'win').length;
          const todayLosses = todaysResolvedBets.filter(b => b.result === 'lose').length;
          const todayTotal = todayWins + todayLosses;
          const todayWinrate = todayTotal > 0 ? (todayWins / todayTotal) * 100 : 0;
          const todayProfit = todaysResolvedBets.reduce((acc, bet) => acc + calculateProfit(bet), 0);

          return (
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" /> Resultados de Hoje
                </h2>
                <div className="flex items-center gap-4 text-sm font-medium bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">{todayWins} Greens</span>
                    <span className="text-slate-600">-</span>
                    <span className="text-red-400">{todayLosses} Reds</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className="text-blue-400">{todayWinrate.toFixed(1)}% de Acerto</div>
                  <div className="w-px h-4 bg-slate-800"></div>
                  <div className={`${todayProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {todayProfit >= 0 ? '+' : ''}{formatNumberBR(todayProfit, 2)} Unidades
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysResolvedBets.map(bet => {
                  const profit = calculateProfit(bet);
                  return (
                    <div key={bet.id} className={`bg-slate-900 border rounded-2xl p-5 relative overflow-hidden ${
                      bet.result === 'win' ? 'border-emerald-500/30' :
                      bet.result === 'lose' ? 'border-red-500/30' :
                      'border-slate-500/30'
                    }`}>
                      <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg ${
                        bet.result === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                        bet.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {bet.result === 'win' ? 'GREEN' : bet.result === 'lose' ? 'RED' : 'ANULADO'}
                      </div>
                      <div className="text-sm text-slate-400 mb-1">{bet.date ? format(parseISO(bet.date), 'dd/MM/yyyy') : ''}</div>
                      <div className="font-bold text-lg mb-2">{bet.match}</div>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                        <span className="text-slate-300 text-sm">{bet.strategy}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-sm">Odd: {formatNumberBR(bet.odd, 2)}</span>
                          <span className={`font-mono font-bold ${
                            bet.result === 'void' ? 'text-slate-400' :
                            profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {bet.result === 'void' ? '0,00 U' : `${profit >= 0 ? '+' : ''}${formatNumberBR(profit, 2)} U`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Estratégia</label>
              <select 
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as Strategy | 'All')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="All">Todas as Estratégias</option>
                {strategies.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Período</label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todo o Histórico</option>
                <option value="thisMonth">Este Mês</option>
                <option value="thisYear">Este Ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-2">Início</label>
                  <input 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-2">Fim</label>
                  <input 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-slate-400 text-sm font-medium mb-1">Lucro Total</div>
              <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}{formatNumberBR(stats.totalProfit, 2)} U
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-slate-400 text-sm font-medium mb-1">Taxa de Acerto</div>
              <div className="text-2xl font-bold text-slate-100">
                {formatNumberBR(stats.winRate, 1)}%
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className="text-slate-400 text-sm font-medium mb-1">Operações Resolvidas</div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.totalBets}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Evolution Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6">Evolução do Lucro (Unidades)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    tick={{fontSize: 12}}
                    minTickGap={30}
                  />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => formatNumberBR(val, 0)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: number) => [`${formatNumberBR(value, 2)} U`, 'Lucro']}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit by Strategy Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6">Lucro por Estratégia</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.strategyChartData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#94a3b8" 
                    tick={{fontSize: 11}} 
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    formatter={(value: number) => [`${formatNumberBR(value, 2)} U`, 'Lucro']}
                    cursor={{fill: '#1e293b'}}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {stats.strategyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold">Histórico de Operações</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Jogo</th>
                  <th className="px-6 py-4 font-medium">Estratégia</th>
                  <th className="px-6 py-4 font-medium text-right">Odd</th>
                  <th className="px-6 py-4 font-medium text-center">Resultado</th>
                  <th className="px-6 py-4 font-medium text-right">Lucro/Prejuízo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredBets.slice(0, 100).map((bet) => {
                  const profit = calculateProfit(bet);
                  return (
                    <tr key={bet.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-slate-300">
                        {bet.date ? format(parseISO(bet.date), 'dd/MM/yyyy') : ''}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">{bet.match}</td>
                      <td className="px-6 py-4 text-slate-400">{bet.strategy}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{formatNumberBR(bet.odd, 2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          bet.result === 'win' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : bet.result === 'lose'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : bet.result === 'void'
                            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {bet.result === 'win' ? 'Green' : bet.result === 'lose' ? 'Red' : bet.result === 'void' ? 'Anulado' : 'Pendente'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${
                        bet.result === 'pending' ? 'text-slate-500' :
                        bet.result === 'void' ? 'text-slate-400' :
                        profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {bet.result === 'pending' ? '-' : bet.result === 'void' ? '0,00 U' : `${profit >= 0 ? '+' : ''}${formatNumberBR(profit, 2)} U`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBets.length > 100 && (
              <div className="p-4 text-center text-slate-500 text-sm border-t border-slate-800">
                Mostrando as últimas 100 operações filtradas.
              </div>
            )}
            {filteredBets.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Nenhuma operação encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-500" />
                Meu Perfil
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {profileError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm">
                  {profileSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Nome de Exibição</label>
                <input 
                  type="text"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Como você quer ser chamado?"
                />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Alterar Senha</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Senha Atual</label>
                    <input 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Necessário apenas para alterar a senha"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Nova Senha</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Deixe em branco para não alterar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Confirmar Nova Senha</label>
                    <input 
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
