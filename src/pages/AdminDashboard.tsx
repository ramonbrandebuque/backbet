import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LogOut, Plus, Users, Target, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import { Strategy, Role } from '../types';
import { strategies } from '../data/mockData';
import { formatNumberBR, formatDateBR } from '../utils/format';

export default function AdminDashboard() {
  const { user, logout, bets, addBet, updateBet, multiBets, addMultiBet, updateMultiBet, users, addUser, updateUserVipDays, deleteUser, toggleUserStatus } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bets' | 'users'>('bets');

  const singleStrategies = strategies.filter(s => !s.startsWith('Múltipla'));
  const multiStrategies = strategies.filter(s => s.startsWith('Múltipla'));

  // Bet Form State
  const [betDate, setBetDate] = useState('');
  const [betMatch, setBetMatch] = useState('');
  const [selectedStrategies, setSelectedStrategies] = useState<Record<string, { selected: boolean, odd: string }>>(
    singleStrategies.reduce((acc, s) => ({ ...acc, [s]: { selected: false, odd: '' } }), {})
  );
  const [betResult, setBetResult] = useState<'win' | 'lose' | 'pending'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multiple Bet Form State
  const [multiDate, setMultiDate] = useState('');
  const [multiStrategy, setMultiStrategy] = useState<string>(multiStrategies[0] || '');
  const [multiGames, setMultiGames] = useState<{ match: string, odd: string }[]>([
    { match: '', odd: '' },
    { match: '', odd: '' },
    { match: '', odd: '' },
    { match: '', odd: '' }
  ]);
  const [multiResult, setMultiResult] = useState<'win' | 'lose' | 'pending'>('pending');

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('vip');
  const [newVipDays, setNewVipDays] = useState('30');

  // Filter State
  const [betFilter, setBetFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredAdminBets = bets.filter(b => {
    if (betFilter === 'pending' && b.result !== 'pending') return false;
    if (betFilter === 'resolved' && b.result === 'pending') return false;
    
    if (startDate && b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    
    return true;
  }).slice(0, 100);

  const filteredAdminMultiBets = multiBets.filter(b => {
    if (betFilter === 'pending' && b.result !== 'pending') return false;
    if (betFilter === 'resolved' && b.result === 'pending') return false;
    
    if (startDate && b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    
    return true;
  }).slice(0, 100);

  const handleLogout = () => {
    logout();
  };

  const handleStrategyToggle = (strategy: string) => {
    setSelectedStrategies(prev => ({
      ...prev,
      [strategy]: {
        ...prev[strategy],
        selected: !prev[strategy].selected
      }
    }));
  };

  const handleOddChange = (strategy: string, odd: string) => {
    setSelectedStrategies(prev => ({
      ...prev,
      [strategy]: {
        ...prev[strategy],
        odd
      }
    }));
  };

  const handleAddBet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const strategiesToAdd = Object.entries(selectedStrategies)
      .filter(([_, data]: [string, any]) => data.selected && data.odd);

    if (strategiesToAdd.length === 0) {
      alert('Selecione pelo menos uma estratégia e informe a odd.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Encontra o maior ID atual para gerar o próximo sequencialmente
      let maxIdNum = 0;
      bets.forEach(b => {
        // Extrai apenas os números do ID (ex: "bet-2014" -> 2014)
        const match = b.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          // Ignora números muito grandes que provavelmente são timestamps (ex: 1775531720)
          // Consideramos IDs sequenciais normais como menores que 1.000.000.000
          if (num > maxIdNum && num < 1000000000) {
            maxIdNum = num;
          }
        }
      });

      let nextIdNum = maxIdNum > 0 ? maxIdNum + 1 : 1;

      for (const [strategy, data] of strategiesToAdd as [string, { selected: boolean, odd: string }][]) {
        await addBet({
          id: `bet-${nextIdNum}`,
          date: betDate,
          match: betMatch,
          strategy: strategy as Strategy,
          odd: Number(data.odd),
          result: betResult
        });
        nextIdNum++; // Incrementa para a próxima estratégia, se houver mais de uma
      }

      setBetMatch('');
      setSelectedStrategies(singleStrategies.reduce((acc, s) => ({ ...acc, [s]: { selected: false, odd: '' } }), {}));
      setBetResult('pending');
      alert('Aposta(s) cadastrada(s) com sucesso!');
    } catch (error) {
      console.error("Erro ao adicionar apostas", error);
      alert('Erro ao cadastrar apostas. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMultiBet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validGames = multiGames.filter(g => g.match.trim() !== '' && g.odd.trim() !== '');
    if (validGames.length === 0) {
      alert('Adicione pelo menos um jogo válido com odd.');
      return;
    }

    setIsSubmitting(true);
    try {
      let maxIdNum = 0;
      multiBets.forEach(b => {
        const match = b.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxIdNum && num < 1000000000) {
            maxIdNum = num;
          }
        }
      });

      let nextIdNum = maxIdNum > 0 ? maxIdNum + 1 : 1;

      const finalOdd = validGames.reduce((acc, curr) => acc * Number(curr.odd), 1);

      await addMultiBet({
        id: `multi-${nextIdNum}`,
        date: multiDate,
        strategy: multiStrategy as Strategy,
        games: validGames.map(g => ({ match: g.match, odd: Number(g.odd) })),
        finalOdd: finalOdd,
        result: multiResult
      });

      setMultiGames([
        { match: '', odd: '' },
        { match: '', odd: '' },
        { match: '', odd: '' },
        { match: '', odd: '' }
      ]);
      setMultiResult('pending');
      alert('Aposta múltipla cadastrada com sucesso!');
    } catch (error) {
      console.error("Erro ao adicionar aposta múltipla", error);
      alert('Erro ao cadastrar aposta múltipla. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      id: `user-${Date.now()}`,
      username: newUsername,
      password: newPassword,
      role: newRole,
      vipDaysRemaining: newRole === 'vip' ? Number(newVipDays) : undefined
    });
    setNewUsername('');
    setNewPassword('');
    alert('Usuário cadastrado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-emerald-500">Admin Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Olá, {user?.username}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('bets')}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'bets' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
          >
            <Target className="w-5 h-5" /> Gerenciar Apostas
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
          >
            <Users className="w-5 h-5" /> Gerenciar Usuários
          </button>
        </div>

        {activeTab === 'bets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" /> Nova Aposta Simples
                </h2>
                <form onSubmit={handleAddBet} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Data</label>
                    <input type="date" required value={betDate} onChange={e => setBetDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Jogo (Ex: Flamengo vs Vasco)</label>
                    <input type="text" required value={betMatch} onChange={e => setBetMatch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Estratégias e Odds</label>
                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      {singleStrategies.map(s => (
                        <div key={s} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`strategy-${s}`}
                            checked={selectedStrategies[s]?.selected || false}
                            onChange={() => handleStrategyToggle(s)}
                            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                          />
                          <label htmlFor={`strategy-${s}`} className="text-sm text-slate-300 flex-1 cursor-pointer">
                            {s}
                          </label>
                          {selectedStrategies[s]?.selected && (
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Odd"
                              required
                              value={selectedStrategies[s]?.odd || ''}
                              onChange={(e) => handleOddChange(s, e.target.value)}
                              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm focus:border-emerald-500 outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Resultado</label>
                    <select value={betResult} onChange={e => setBetResult(e.target.value as 'win'|'lose'|'pending'|'void')} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none">
                      <option value="pending">Pendente (Dica Futura)</option>
                      <option value="win">Green (Ganho)</option>
                      <option value="lose">Red (Perda)</option>
                      <option value="void">Anulado (Devolvida)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-emerald-300 text-white py-3 rounded-xl font-semibold mt-4 transition-colors">
                    {isSubmitting ? 'Salvando...' : 'Salvar Aposta(s)'}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" /> Nova Aposta Múltipla
                </h2>
                <form onSubmit={handleAddMultiBet} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Data</label>
                    <input type="date" required value={multiDate} onChange={e => setMultiDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Estratégia</label>
                    <select value={multiStrategy} onChange={e => setMultiStrategy(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none">
                      {multiStrategies.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm text-slate-400">Jogos da Múltipla</label>
                      <button 
                        type="button" 
                        onClick={() => setMultiGames([...multiGames, { match: '', odd: '' }])}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Jogo
                      </button>
                    </div>
                    <div className="space-y-3">
                      {multiGames.map((game, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              placeholder={`Jogo ${index + 1}`}
                              value={game.match}
                              onChange={e => {
                                const newGames = [...multiGames];
                                newGames[index].match = e.target.value;
                                setMultiGames(newGames);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            />
                          </div>
                          <div className="w-24">
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Odd"
                              value={game.odd}
                              onChange={e => {
                                const newGames = [...multiGames];
                                newGames[index].odd = e.target.value;
                                setMultiGames(newGames);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            />
                          </div>
                          {multiGames.length > 2 && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newGames = multiGames.filter((_, i) => i !== index);
                                setMultiGames(newGames);
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 transition-colors mt-0.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Odd Final Preview */}
                    <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                      <span className="text-sm text-slate-400">Odd Final Calculada:</span>
                      <span className="font-bold text-emerald-400">
                        {formatNumberBR(
                          multiGames.reduce((acc, curr) => {
                            const oddVal = Number(curr.odd);
                            return acc * (oddVal > 0 ? oddVal : 1);
                          }, 1), 
                          2
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Resultado</label>
                    <select value={multiResult} onChange={e => setMultiResult(e.target.value as 'win'|'lose'|'pending'|'void')} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none">
                      <option value="pending">Pendente (Dica Futura)</option>
                      <option value="win">Green (Ganho)</option>
                      <option value="lose">Red (Perda)</option>
                      <option value="void">Anulado (Devolvida)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-emerald-300 text-white py-3 rounded-xl font-semibold mt-4 transition-colors">
                    {isSubmitting ? 'Salvando...' : 'Salvar Múltipla'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
                  <button 
                    onClick={() => setBetFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${betFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Todas
                  </button>
                  <button 
                    onClick={() => setBetFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${betFilter === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Pendentes
                  </button>
                  <button 
                    onClick={() => setBetFilter('resolved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${betFilter === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Resolvidas
                  </button>
                </div>
                
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-500 mb-1">Data Inicial</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-500 mb-1">Data Final</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="mt-5 text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-lg font-bold">Apostas Simples</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">Data</th>
                        <th className="px-6 py-4 font-medium">Jogo</th>
                        <th className="px-6 py-4 font-medium">Estratégia</th>
                        <th className="px-6 py-4 font-medium">Odd</th>
                        <th className="px-6 py-4 font-medium">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredAdminBets.map(bet => (
                        <tr key={bet.id}>
                          <td className="px-6 py-4">{formatDateBR(bet.date)}</td>
                          <td className="px-6 py-4">{bet.match}</td>
                          <td className="px-6 py-4">{bet.strategy}</td>
                          <td className="px-6 py-4">{formatNumberBR(bet.odd, 2)}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={bet.result} 
                              onChange={(e) => updateBet(bet.id, e.target.value as 'win'|'lose'|'pending'|'void')}
                              className={`px-2 py-1 rounded text-xs font-medium outline-none border border-transparent focus:border-slate-600 ${
                                bet.result === 'win' ? 'bg-emerald-500/20 text-emerald-400' : 
                                bet.result === 'lose' ? 'bg-red-500/20 text-red-400' : 
                                bet.result === 'void' ? 'bg-slate-500/20 text-slate-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              <option value="pending" className="bg-slate-900 text-amber-400">Pendente</option>
                              <option value="win" className="bg-slate-900 text-emerald-400">Green</option>
                              <option value="lose" className="bg-slate-900 text-red-400">Red</option>
                              <option value="void" className="bg-slate-900 text-slate-400">Anulado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-lg font-bold">Apostas Múltiplas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">Data</th>
                        <th className="px-6 py-4 font-medium">Jogos</th>
                        <th className="px-6 py-4 font-medium">Estratégia</th>
                        <th className="px-6 py-4 font-medium">Odd Final</th>
                        <th className="px-6 py-4 font-medium">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredAdminMultiBets.map(bet => (
                        <tr key={bet.id}>
                          <td className="px-6 py-4">{formatDateBR(bet.date)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {bet.games.map((g, i) => (
                                <span key={i} className="text-xs text-slate-300">{g.match} ({formatNumberBR(g.odd, 2)})</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">{bet.strategy}</td>
                          <td className="px-6 py-4">{formatNumberBR(bet.finalOdd, 2)}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={bet.result} 
                              onChange={(e) => updateMultiBet(bet.id, e.target.value as 'win'|'lose'|'pending'|'void')}
                              className={`px-2 py-1 rounded text-xs font-medium outline-none border border-transparent focus:border-slate-600 ${
                                bet.result === 'win' ? 'bg-emerald-500/20 text-emerald-400' : 
                                bet.result === 'lose' ? 'bg-red-500/20 text-red-400' : 
                                bet.result === 'void' ? 'bg-slate-500/20 text-slate-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              <option value="pending" className="bg-slate-900 text-amber-400">Pendente</option>
                              <option value="win" className="bg-slate-900 text-emerald-400">Green</option>
                              <option value="lose" className="bg-slate-900 text-red-400">Red</option>
                              <option value="void" className="bg-slate-900 text-slate-400">Anulado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" /> Novo Usuário
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Usuário</label>
                  <input type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Senha</label>
                  <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none">
                    <option value="vip">VIP</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newRole === 'vip' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Dias VIP</label>
                    <input type="number" required value={newVipDays} onChange={e => setNewVipDays(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                )}
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold mt-4">
                  Cadastrar Usuário
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold">Usuários Cadastrados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Usuário</th>
                      <th className="px-6 py-4 font-medium">Tipo</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Dias VIP Restantes</th>
                      <th className="px-6 py-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-medium">{u.username}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${u.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.role === 'vip' ? (
                            <input 
                              type="number" 
                              value={u.vipDaysRemaining || 0} 
                              onChange={(e) => updateUserVipDays(u.id, Number(e.target.value))}
                              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:border-emerald-500 outline-none"
                            />
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleUserStatus(u.id)}
                              className={`p-2 rounded-lg transition-colors ${u.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}`}
                              title={u.status === 'suspended' ? 'Ativar Usuário' : 'Suspender Usuário'}
                            >
                              {u.status === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Deletar Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
