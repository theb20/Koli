/** Âge en années révolues à la date du jour, à partir d'une date de naissance. */
export function getAge(birthdate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthdate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthdate.getMonth() ||
    (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate())
  if (!hasHadBirthdayThisYear) age--
  return age
}

export const MIN_AGE = 18
