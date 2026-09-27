const EMERGENCY_NUMBERS = {
  Morocco: '150',
  France: '15',
  Algeria: '14',
  Tunisia: '190',
  'United States': '911',
  USA: '911',
  Canada: '911',
  'United Kingdom': '999',
  UK: '999',
  Australia: '000',
  Spain: '112',
  Italy: '112',
  Germany: '112',
  Belgium: '112',
  Switzerland: '144',
};

export function getEmergencyNumber(country) {
  if (!country) return '112';
  if (EMERGENCY_NUMBERS[country]) return EMERGENCY_NUMBERS[country];
  const normalized = country.toLowerCase().trim();
  for (const [key, value] of Object.entries(EMERGENCY_NUMBERS)) {
    if (key.toLowerCase() === normalized) return value;
  }
  return '112';
}

export default getEmergencyNumber;
