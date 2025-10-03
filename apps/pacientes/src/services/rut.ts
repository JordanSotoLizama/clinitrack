// Normaliza, formatea y valida RUT
export function normalizeRut(raw: string) {
  const s = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!s) return ''
  const cuerpo = s.slice(0, -1)
  const dv = s.slice(-1)
  return `${cuerpo}-${dv}`
}
export function formatRut(raw: string) {
  const s = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  const cuerpo = s.slice(0, -1)
  const dv = s.slice(-1)
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return cuerpo ? (dv ? `${conPuntos}-${dv}` : conPuntos) : dv
}
export function isValidRut(raw: string) {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!/^[0-9]+[0-9K]$/.test(clean)) return false
  const cuerpo = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let suma = 0, multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  const dvCalc = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === dvCalc
}