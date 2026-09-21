// Custom Soundex implementation for phonetic name matching
export const soundex = (name: string): string => {
  if (!name) return '';
  
  const s = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  const first = s[0];
  const mappings: Record<string, string> = {
    A: '', E: '', I: '', O: '', U: '', Y: '', H: '', W: '',
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };

  let code = first;
  let prevCode = mappings[first] || '';

  for (let i = 1; i < s.length; i++) {
    const char = s[i];
    const currCode = mappings[char];

    if (currCode !== undefined) {
      if (currCode !== '' && currCode !== prevCode) {
        code += currCode;
      }
      // H and W do not act as separators in standard Soundex
      if (char !== 'H' && char !== 'W') {
        prevCode = currCode;
      }
    }
  }

  // Pad with zeros or truncate to 4 chars
  return (code + '000').substring(0, 4);
};
