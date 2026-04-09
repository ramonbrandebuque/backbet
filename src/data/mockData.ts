import { Bet, Strategy, User, MultiBet } from '../types';

export const strategies: Strategy[] = [
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

export const initialMockBets: Bet[] = [];

export const initialMockUsers: User[] = [
  { id: '1', username: 'admin', password: 'A*b1590250', role: 'admin', status: 'active' }
];

export const calculateProfit = (bet: Bet | MultiBet): number => {
  if (bet.result === 'pending' || bet.result === 'void') return 0;
  
  const odd = 'finalOdd' in bet ? bet.finalOdd : bet.odd;
  
  if (bet.result === 'win') {
    return odd - 1;
  } else {
    return -1;
  }
};
