export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const bd = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
    age--;
  }
  return age > 0 && age < 150 ? age : null;
}
