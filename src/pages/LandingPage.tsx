import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShieldCheck, Target, BarChart3, ArrowRight, CheckCircle2, Calculator, Plus, Minus } from 'lucide-react';
import { calculateProfit } from '../data/mockData';
import { StrategyStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { formatNumberBR } from '../utils/format';

const faqs = [
  {
    question: "O que são apostas em Back?",
    answer: (
      <>
        Apostas "Back" (ou apostas a favor) significam apostar que um determinado evento <strong>VAI</strong> acontecer. 
        Por exemplo, ao fazer um "Back Vitória Casa", você ganha a aposta se o time da casa vencer. 
        É a forma mais tradicional e comum de se fazer apostas esportivas.
      </>
    )
  },
  {
    question: "Qual o valor de banca recomendado?",
    answer: (
      <>
        Recomendamos utilizar 1% da banca por unidade. O ideal é ter uma banca que permita fazer as entradas com segurança e seguir a gestão corretamente, respeitando o valor mínimo de aposta da sua casa de apostas preferida.
      </>
    )
  },
  {
    question: "Como funcionam as Odds em Back?",
    answer: (
      <>
        <p className="mb-4">
          Na aposta a favor (Back), a odd multiplica o valor da sua aposta para determinar o seu retorno total. O seu lucro é o retorno total menos o valor apostado.
        </p>
        <p>
          <strong>Exemplo Prático:</strong> Se você faz uma aposta Back com uma <strong>Odd de 1.90</strong> usando uma unidade de <strong>R$ 10,00</strong>:
          <br/>• Se você <strong>ganhar</strong> a aposta, seu lucro será de <strong>R$ 9,00</strong> (0.9 unidades), pois o cálculo do lucro é: <code>Valor da Aposta × (Odd - 1)</code>.
          <br/>• Se você <strong>perder</strong> a aposta, você perde o valor apostado de <strong>R$ 10,00</strong> (1 unidade).
        </p>
      </>
    )
  },
  {
    question: "Devo seguir todas as estratégias?",
    answer: (
      <>
        Nós operamos todas as nossas estratégias simultaneamente para diversificar o portfólio. No entanto, a depender do valor da sua banca e do seu perfil de risco, recomendamos que você escolha a estratégia (ou as estratégias) que mais lhe agradar e focar nela. Analise o histórico, a odd média e o winrate de cada uma para tomar sua decisão.
      </>
    )
  },
  {
    question: "O que significa unidade?",
    answer: (
      <>
        No nosso sistema de gestão, 1 Unidade (U) representa exatamente <strong>1% da sua banca total</strong>. 
        Se a sua banca é de R$ 1.000,00, 1 Unidade equivale a R$ 10,00. Utilizar unidades em vez de valores financeiros ajuda a padronizar os resultados e manter a disciplina na gestão de banca, independentemente do tamanho do seu capital.
      </>
    )
  },
  {
    question: "Qual a frequência das apostas?",
    answer: (
      <>
        Não temos apostas todos os dias. O nosso foco principal é a <strong>qualidade</strong> das entradas e não a quantidade. Analisamos criteriosamente os jogos para encontrar as melhores oportunidades onde a probabilidade matemática está a nosso favor.
      </>
    )
  },
  {
    question: "Em quais mercados trabalhamos?",
    answer: (
      <>
        Operamos nos principais mercados de gols e probabilidades (Match Odds). Nosso foco está nas principais ligas e também em divisões secundárias, onde encontramos os melhores padrões e oportunidades de valor para as nossas estratégias.
      </>
    )
  }
];

export default function LandingPage() {
  const { bets } = useAppContext();
  const [unitValue, setUnitValue] = useState<number>(10);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const stats = useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;
    let totalProfit = 0;
    
    const strategyMap = new Map<string, StrategyStats & { totalOdds: number }>();

    bets.forEach(bet => {
      if (bet.result === 'pending') return;

      if (bet.result === 'win') totalWins++;
      else totalLosses++;
      
      const profit = calculateProfit(bet);
      totalProfit += profit;

      const current = strategyMap.get(bet.strategy) || {
        strategy: bet.strategy,
        totalBets: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        profit: 0,
        averageOdd: 0,
        totalOdds: 0
      };

      current.totalBets++;
      if (bet.result === 'win') current.wins++;
      else current.losses++;
      current.profit += profit;
      current.totalOdds += bet.odd;
      current.winRate = (current.wins / current.totalBets) * 100;
      current.averageOdd = current.totalOdds / current.totalBets;

      strategyMap.set(bet.strategy, current);
    });

    const strategyStats = Array.from(strategyMap.values()).map(({ totalOdds, ...rest }) => rest).sort((a, b) => b.profit - a.profit);
    
    // Calculate cumulative profit for chart
    const resolvedBets = [...bets].filter(b => b.result !== 'pending').reverse();
    let cumulative = 0;
    const chartData = resolvedBets.map((bet, index) => {
      cumulative += calculateProfit(bet);
      return {
        index,
        profit: cumulative
      };
    });

    // Sample data for a smoother chart on landing page
    const sampledChartData = chartData.filter((_, i) => i % 10 === 0 || i === chartData.length - 1);

    const totalResolvedBets = totalWins + totalLosses;

    return {
      totalBets: totalResolvedBets,
      winRate: totalResolvedBets > 0 ? (totalWins / totalResolvedBets) * 100 : 0,
      totalProfit,
      strategyStats,
      chartData: sampledChartData
    };
  }, [bets]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight">BackBet<span className="text-emerald-500">Pro</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
            Assinar Agora
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-8 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Estratégias validadas em +{stats.totalBets} jogos
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Domine o mercado com <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Estratégias de Back
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Consultoria especializada em apostas a favor (Back). Maximize seus lucros com métodos validados, histórico transparente e gestão de banca inteligente.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/login" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-1">
            Quero ser VIP <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#resultados" className="w-full sm:w-auto px-8 py-4 rounded-full text-lg font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all">
            Ver Resultados
          </a>
        </div>
      </section>

      {/* Stats Overview */}
      <section id="resultados" className="bg-slate-900/50 border-y border-slate-800/50 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Desempenho Geral</h2>
            <p className="text-slate-400">Números reais baseados no nosso histórico de operações.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Target className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">{formatNumberBR(stats.winRate, 1)}%</div>
              <div className="text-slate-400 font-medium">Taxa de Acerto (Winrate)</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <TrendingUp className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2 text-emerald-400">+{formatNumberBR(stats.totalProfit, 3)} U</div>
              <div className="text-slate-400 font-medium">Lucro Acumulado (Unidades)</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <BarChart3 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">{stats.totalBets}</div>
              <div className="text-slate-400 font-medium">Operações Realizadas</div>
            </div>
          </div>

          {/* Profit Simulator */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Simulador de Lucros</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Descubra quanto você teria lucrado seguindo nossas estratégias. 
                <strong> Recomendamos utilizar 1% do valor total da sua banca como o valor de cada unidade.</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                <div className="w-full md:w-1/2 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Valor da sua Unidade (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                      <input 
                        type="number" 
                        min="1"
                        step="1"
                        value={unitValue}
                        onChange={(e) => setUnitValue(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Exemplo: Se sua banca é de R$ 1.000, sua unidade deve ser R$ 10.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
                    <div className="text-sm text-slate-400 font-medium mb-2">Lucro Projetado (Baseado no Histórico)</div>
                    <div className={`text-5xl font-extrabold tracking-tight ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      R$ {formatNumberBR(stats.totalProfit * unitValue, 2)}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-sm">
                      <span className="text-slate-500">Unidades Totais:</span>
                      <span className="font-medium text-slate-300">+{formatNumberBR(stats.totalProfit, 3)} U</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Crescimento da Banca (Unidades)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => formatNumberBR(val, 0)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: number) => [`${formatNumberBR(value, 3)} U`, 'Lucro']}
                    labelFormatter={() => ''}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Breakdown */}
      <section className="py-24 container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Nossas Estratégias</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Focamos em mercados específicos onde a probabilidade está a nosso favor. 
            Veja o desempenho detalhado de cada método.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.strategyStats.map((stat, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors">
              <h3 className="text-lg font-bold mb-4 text-emerald-50">{stat.strategy}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Winrate</span>
                  <span className="font-semibold text-emerald-400">{formatNumberBR(stat.winRate, 1)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stat.winRate}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400 text-sm">Lucro</span>
                  <span className={`font-semibold ${stat.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stat.profit >= 0 ? '+' : ''}{formatNumberBR(stat.profit, 3)} U
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Operações</span>
                  <span className="font-semibold">{stat.totalBets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Odd Média</span>
                  <span className="font-semibold text-slate-300">{formatNumberBR(stat.averageOdd, 2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-24 bg-slate-900/30 border-y border-slate-800/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-slate-400">Tudo o que você precisa saber antes de começar a lucrar conosco.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <h3 className="text-lg font-bold text-emerald-400">{faq.question}</h3>
                  <div className="flex-shrink-0 ml-4 text-slate-400">
                    {openFaqIndex === index ? (
                      <Minus className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </div>
                </button>
                
                {openFaqIndex === index && (
                  <div className="px-6 pb-6 text-slate-300 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-900/20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">Pronto para lucrar como profissional?</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Tenha acesso imediato a todas as nossas entradas, histórico completo detalhado e suporte exclusivo.
          </p>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto mb-10 shadow-2xl">
            <div className="text-2xl font-bold mb-2">Acesso VIP</div>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-extrabold">R$ 97</span>
              <span className="text-slate-400">/mês</span>
            </div>
            
            <ul className="space-y-4 text-left mb-8">
              {[
                'Acesso ao Dashboard VIP',
                'Histórico completo de operações',
                'Filtros avançados e gráficos',
                'Todas as 10 estratégias',
                'Suporte prioritário'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
            
            <Link to="/login" className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl text-lg font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Assinar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-slate-500 text-sm">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} BackBet Consultoria. Todos os direitos reservados.</p>
          <p className="mt-2">Apostas esportivas envolvem risco. Jogue com responsabilidade.</p>
        </div>
      </footer>
    </div>
  );
}
