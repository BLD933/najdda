/* Single source of truth for emergency numbers (web). Previously
   copy-pasted in Dashboard, Chat, Domain and Emergency pages — same values,
   four places to forget. Country comes from the user profile. */
const EMERGENCY_BY_COUNTRY = {
  Morocco: '150',
  Algeria: '14',
  Tunisia: '190',
  France: '15',
  USA: '911',
  Canada: '911',
  UK: '999',
  Spain: '112',
};

export function getEmergencyNumber(country) {
  return EMERGENCY_BY_COUNTRY[country] || '112';
}
