
export const numberToWords = (num: number): string => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] !== '00' ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
  str += n[2] !== '00' ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
  str += n[3] !== '00' ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
  str += n[4] !== '00' ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
  str += n[5] !== '00' ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return 'Rupees ' + str.trim().toUpperCase() + ' ONLY';
};

/**
 * Converts Excel serial date (e.g. 46030) to ISO string (YYYY-MM-DD)
 */
export const excelDateToISO = (serial: any): string => {
  if (!serial) return '';
  
  // If it's already a string like "YYYY-MM-DD", return it
  if (typeof serial === 'string' && serial.includes('-') && serial.length === 10) return serial;

  const num = Number(serial);
  if (isNaN(num)) return '';

  // Excel serial dates typically fall between 30000 (1982) and 60000 (2064)
  if (num > 30000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  return '';
};

/**
 * Formats ISO date (YYYY-MM-DD) to Display Format (DD-MM-YYYY)
 */
export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
};
