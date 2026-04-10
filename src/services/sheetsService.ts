import Papa from 'papaparse';
import { Bet, User } from '../types';
import { GOOGLE_SCRIPT_URL } from '../config/sheetsConfig';

// Converte DD/MM/AAAA, DD/MM/AA ou DD/MM para YYYY-MM-DD
const parseBrazilianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Se já estiver no formato YYYY-MM-DD, retorna direto
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    return dateStr;
  }

  const parts = dateStr.split('/');
  
  let day, month, year;

  if (parts.length === 3) {
    [day, month, year] = parts;
  } else if (parts.length === 2) {
    [day, month] = parts;
    year = new Date().getFullYear().toString();
  } else {
    return dateStr; // Fallback se não for data válida
  }
  
  // Se o ano tiver 2 dígitos (ex: 26), converte para 2026
  if (year.length === 2) {
    year = `20${year}`;
  }

  // Garante que dia e mês tenham 2 dígitos
  day = day.padStart(2, '0');
  month = month.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Função auxiliar para buscar e fazer parse do JSON do Google Visualization API
const fetchGvizJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao buscar: ${res.statusText}`);
  const text = await res.text();
  
  // O Google retorna um texto no formato: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
  if (!match || !match[1]) throw new Error('Formato de resposta inválido do Google Sheets');
  
  const data = JSON.parse(match[1]);
  const headers = data.table.cols.map((c: any) => c.label?.trim());
  
  const rows = data.table.rows.map((r: any) => {
    const rowObj: any = {};
    r.c.forEach((cell: any, i: number) => {
      if (headers[i]) {
        if (cell && cell.v !== null && cell.v !== undefined) {
          // Se for uma data, o valor (v) vem como "Date(YYYY, M, D)"
          if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
            const dateMatch = cell.v.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
            if (dateMatch) {
              const y = dateMatch[1];
              const m = String(Number(dateMatch[2]) + 1).padStart(2, '0'); // Mês é 0-indexado
              const d = dateMatch[3].padStart(2, '0');
              rowObj[headers[i]] = `${y}-${m}-${d}`;
            } else {
              rowObj[headers[i]] = cell.f || cell.v;
            }
          } else {
            // Se for número ou string normal
            rowObj[headers[i]] = cell.f || String(cell.v);
          }
        } else {
          rowObj[headers[i]] = '';
        }
      }
    });
    return rowObj;
  });
  
  return rows;
};

const getProp = (obj: any, prop: string) => {
  const key = Object.keys(obj).find(k => k.toLowerCase() === prop.toLowerCase());
  return key ? obj[key] : undefined;
};

export const fetchSheetData = async (sheetId: string) => {
  // Usamos out:json para ter acesso aos valores brutos (incluindo o ano completo das datas)
  const usersUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Usuários`;
  const betsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Apostas`;
  const multiBetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Multiplas`;

  try {
    const [parsedUsers, parsedBets, parsedMultiBets] = await Promise.all([
      fetchGvizJson(usersUrl),
      fetchGvizJson(betsUrl),
      fetchGvizJson(multiBetsUrl).catch(() => []) // Fallback caso a aba não exista ainda
    ]);

    const users: User[] = parsedUsers.map((row: any) => ({
      id: getProp(row, 'id'),
      username: getProp(row, 'username')?.trim(),
      displayName: getProp(row, 'displayName')?.trim(),
      password: getProp(row, 'password')?.trim(),
      role: getProp(row, 'role')?.trim().toLowerCase() as 'admin' | 'vip',
      status: getProp(row, 'status')?.trim().toLowerCase() as 'active' | 'suspended',
      vipDaysRemaining: getProp(row, 'vipDaysRemaining') ? parseInt(getProp(row, 'vipDaysRemaining'), 10) : undefined
    })).filter((u: any) => u.id && u.username); // Filtra linhas vazias

    const bets: Bet[] = parsedBets.map((row: any) => ({
      id: getProp(row, 'id'),
      date: parseBrazilianDate(getProp(row, 'date')), // parseBrazilianDate agora só serve de fallback se for texto
      match: getProp(row, 'match'),
      strategy: getProp(row, 'strategy'),
      odd: parseFloat(String(getProp(row, 'odd') || '0').replace(',', '.')),
      result: typeof getProp(row, 'result') === 'string' ? getProp(row, 'result').trim().toLowerCase() as 'win' | 'lose' | 'pending' | 'void' : (getProp(row, 'result') || 'pending')
    })).filter((b: any) => b.id && b.match); // Filtra linhas vazias

    const multiBets: import('../types').MultiBet[] = [];
    let currentMultiBet: import('../types').MultiBet | null = null;

    parsedMultiBets.forEach((row: any) => {
      const rowId = getProp(row, 'id');
      const rowDate = getProp(row, 'date');
      const rowStrategy = getProp(row, 'strategy');
      const rowMatch = getProp(row, 'match');
      const rowOdd = getProp(row, 'odd');
      const rawResult = getProp(row, 'result');
      const rowResult = typeof rawResult === 'string' ? rawResult.trim().toLowerCase() : rawResult;

      // Se a linha tem ID (ou data/estratégia), assumimos que é o começo de uma nova múltipla
      // Células mescladas no Google Sheets retornam valor apenas na primeira linha
      if (rowId || (rowDate && rowStrategy)) {
        if (currentMultiBet) {
          multiBets.push(currentMultiBet);
        }
        currentMultiBet = {
          id: rowId || `multi-${Date.now()}-${Math.random()}`, // Fallback se não tiver ID
          date: parseBrazilianDate(rowDate),
          strategy: rowStrategy,
          games: [],
          finalOdd: 1,
          result: (rowResult as 'win' | 'lose' | 'pending' | 'void') || 'pending'
        };
      }
      
      // Adiciona o jogo atual à múltipla corrente
      if (currentMultiBet && rowMatch) {
        const odd = parseFloat(String(rowOdd || '0').replace(',', '.'));
        currentMultiBet.games.push({ match: rowMatch, odd });
        if (odd > 0) {
          currentMultiBet.finalOdd *= odd;
        }
        
        // Se o resultado estiver preenchido em uma linha subsequente (ex: última linha da mesclagem)
        if (rowResult && rowResult !== 'pending') {
          currentMultiBet.result = rowResult as 'win' | 'lose' | 'pending' | 'void';
        }
      }
    });

    if (currentMultiBet) {
      multiBets.push(currentMultiBet);
    }

    return { users, bets, multiBets };
  } catch (error) {
    console.error("Erro ao processar a planilha:", error);
    throw error;
  }
};

export const writeToSheet = async (action: string, data: any) => {
  const scriptUrl = GOOGLE_SCRIPT_URL;
  
  if (!scriptUrl) {
    console.warn('VITE_GOOGLE_SCRIPT_URL não configurada. Alteração feita apenas localmente.');
    return;
  }

  try {
    // Usamos text/plain para evitar o preflight do CORS (OPTIONS request) que o Google Apps Script bloqueia
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, data })
    });
  } catch (error) {
    console.error('Erro ao salvar na planilha:', error);
  }
};
