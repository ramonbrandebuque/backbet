export type Strategy = 
  | 'Mais de 0,5 Gols Casa'
  | 'Múltipla Mais de 0,5 Gols Casa'
  | 'Mais de 1,5 Gols Casa'
  | 'Múltipla Mais de 1,5 Gols Casa'
  | 'Mais de 1,5 Gols'
  | 'Múltipla Mais de 1,5 Gols'
  | 'Mais de 2,5 Gols'
  | 'Múltipla Mais de 2,5 Gols'
  | 'Abaixo de 4,5 Gols'
  | 'Vitoria Casa';

export interface Bet {
  id: string;
  date: string;
  match: string;
  strategy: Strategy;
  odd: number;
  result: 'win' | 'lose' | 'pending' | 'void';
}

export interface MultiBetGame {
  match: string;
  odd: number;
}

export interface MultiBet {
  id: string;
  date: string;
  strategy: Strategy;
  games: MultiBetGame[];
  finalOdd: number;
  result: 'win' | 'lose' | 'pending' | 'void';
}

export interface StrategyStats {
  strategy: Strategy;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  profit: number; // calculated with default commission
  averageOdd: number;
}

export type Role = 'admin' | 'vip';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  password?: string;
  role: Role;
  vipDaysRemaining?: number;
  status?: 'active' | 'suspended';
}
