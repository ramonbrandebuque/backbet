export const formatNumberBR = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatDateBR = (dateString: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};
