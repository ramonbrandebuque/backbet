import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Bet, User, MultiBet } from '../types';
import { initialMockBets, initialMockUsers } from '../data/mockData';
import { fetchSheetData, writeToSheet } from '../services/sheetsService';
import { GOOGLE_SHEET_ID } from '../config/sheetsConfig';

interface AppContextType {
  user: User | null;
  login: (username: string, password?: string) => User | string | false;
  logout: () => void;
  bets: Bet[];
  addBet: (bet: Bet) => void;
  updateBet: (betId: string, result: 'win' | 'lose' | 'pending' | 'void') => void;
  multiBets: MultiBet[];
  addMultiBet: (bet: MultiBet) => void;
  updateMultiBet: (betId: string, result: 'win' | 'lose' | 'pending' | 'void') => void;
  users: User[];
  addUser: (user: User) => void;
  updateUserVipDays: (userId: string, days: number) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  toggleUserStatus: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [bets, setBets] = useState<Bet[]>(initialMockBets);
  const [multiBets, setMultiBets] = useState<MultiBet[]>([]);
  const [users, setUsers] = useState<User[]>(initialMockUsers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sheetId = GOOGLE_SHEET_ID;
        
        if (!sheetId) {
          // Se não houver ID configurado, usa os dados locais (apenas o admin)
          setUsers(initialMockUsers);
          setBets(initialMockBets);
          setMultiBets([]);
          setIsLoading(false);
          return;
        }

        const { users: fetchedUsers, bets: fetchedBets, multiBets: fetchedMultiBets } = await fetchSheetData(sheetId);
        
        // Garante que sempre exista pelo menos o usuário admin caso a planilha esteja vazia
        const finalUsers = fetchedUsers.length > 0 ? fetchedUsers : initialMockUsers;

        // Atualiza o usuário logado se houver mudanças na planilha
        const savedUserStr = localStorage.getItem('user');
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          const updatedUser = finalUsers.find(u => u.id === savedUser.id);
          if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } else {
            // Se o usuário foi deletado da planilha, desloga
            setUser(null);
            localStorage.removeItem('user');
          }
        }

        setUsers(finalUsers);
        
        // Ordena as apostas da mais recente para a mais antiga
        const sortedBets = fetchedBets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBets(sortedBets);

        const sortedMultiBets = fetchedMultiBets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMultiBets(sortedMultiBets);
      } catch (err) {
        console.error("Failed to load from Google Sheets", err);
        setError("Erro ao carregar dados da planilha. Verifique se o ID está correto e a planilha está pública.");
        setUsers(initialMockUsers);
        setBets(initialMockBets);
        setMultiBets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const login = (username: string, password?: string) => {
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      if (foundUser.role === 'vip' && foundUser.vipDaysRemaining !== undefined && foundUser.vipDaysRemaining <= 0) {
        return 'Sua assinatura expirou. Entre em contato com o suporte para renovar.';
      }
      if (foundUser.status === 'suspended') {
        return 'Conta suspensa. Entre em contato com o suporte.';
      }
      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));
      return foundUser;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const addBet = async (bet: Bet) => {
    setBets(prev => [bet, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    await writeToSheet('addBet', bet);
  };

  const updateBet = async (betId: string, result: 'win' | 'lose' | 'pending' | 'void') => {
    setBets(prev => prev.map(b => b.id === betId ? { ...b, result } : b));
    await writeToSheet('updateBet', { id: betId, result });
  };

  const addMultiBet = async (multiBet: MultiBet) => {
    setMultiBets(prev => [multiBet, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    await writeToSheet('addMultiBet', multiBet);
  };

  const updateMultiBet = async (betId: string, result: 'win' | 'lose' | 'pending' | 'void') => {
    setMultiBets(prev => prev.map(b => b.id === betId ? { ...b, result } : b));
    await writeToSheet('updateMultiBet', { id: betId, result });
  };

  const addUser = async (newUser: User) => {
    const userWithStatus = { ...newUser, status: 'active' as const };
    setUsers(prev => [...prev, userWithStatus]);
    await writeToSheet('addUser', userWithStatus);
  };

  const updateUserVipDays = async (userId: string, days: number) => {
    let newStatus = 'active';
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        newStatus = days <= 0 ? 'suspended' : u.status;
        return { ...u, vipDaysRemaining: days, status: newStatus as 'active' | 'suspended' };
      }
      return u;
    }));
    await writeToSheet('updateUserVipDays', { id: userId, days, status: newStatus });
  };

  const updateUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (user?.id === updatedUser.id) {
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    // Como você não tem a ação 'updateUser' no Google Apps Script,
    // usamos a combinação de deletar a linha antiga e adicionar a nova.
    try {
      // 1. Deleta a linha antiga
      await writeToSheet('deleteUser', { id: updatedUser.id });
      
      // 2. Aguarda 1 segundo para dar tempo do Google Sheets processar a exclusão
      // (Isso evita que a nova linha seja inserida antes da antiga ser apagada)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Adiciona a nova linha com os dados atualizados (mesmo ID, nova senha/nome)
      await writeToSheet('addUser', updatedUser);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    await writeToSheet('deleteUser', { id: userId });
  };

  const toggleUserStatus = async (userId: string) => {
    let newStatus = '';
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        newStatus = u.status === 'suspended' ? 'active' : 'suspended';
        return { ...u, status: newStatus as 'active' | 'suspended' };
      }
      return u;
    }));
    await writeToSheet('toggleUserStatus', { id: userId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-emerald-500 font-medium">Carregando dados do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      user, login, logout, bets, addBet, updateBet, multiBets, addMultiBet, updateMultiBet, users, addUser, updateUserVipDays, updateUser, deleteUser, toggleUserStatus, isLoading, error 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
