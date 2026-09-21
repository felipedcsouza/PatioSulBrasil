export function normalizePlate(value = '') { return value.toUpperCase().replace(/[^A-Z0-9]/g, '') }
export function formatDateBR(value) { if (!value) return '-'; return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`)) }
