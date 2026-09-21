const seedVehicles = [
  { id: '1', plate: 'ABC1D23', brand: 'Volkswagen', model: 'Gol', status: 'Em pátio', entryDate: '2026-08-21', destination: 'Pátio Central' },
  { id: '2', plate: 'EFG4H56', brand: 'Chevrolet', model: 'Onix', status: 'Liberado', entryDate: '2026-08-18', destination: 'Retirada pelo proprietário' },
  { id: '3', plate: 'IJK7L89', brand: 'Fiat', model: 'Strada', status: 'Leilão', entryDate: '2026-08-11', destination: 'Leilão' },
  { id: '4', plate: 'MNO0P12', brand: 'Toyota', model: 'Corolla', status: 'Judicial', entryDate: '2026-08-08', destination: 'Retirada judicial' },
  { id: '5', plate: 'QRS3T45', brand: 'Honda', model: 'CG 160', status: 'Em análise', entryDate: '2026-08-25', destination: 'Pátio Central' }
]

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

function readVehicles() {
  const saved = localStorage.getItem('patio-vehicles')
  if (!saved) {
    localStorage.setItem('patio-vehicles', JSON.stringify(seedVehicles))
    return seedVehicles
  }
  return JSON.parse(saved)
}

export const base44Client = {
  auth: {
    async login({ email, password }) {
      await wait()
      if (!email || !password) throw new Error('Informe e-mail e senha.')
      const user = { id: 'u1', name: 'Administrador', email, role: 'admin' }
      localStorage.setItem('patio-user', JSON.stringify(user))
      return user
    },
    async logout() {
      localStorage.removeItem('patio-user')
    },
    currentUser() {
      const raw = localStorage.getItem('patio-user')
      return raw ? JSON.parse(raw) : null
    },
  },
  vehicles: {
    async list() { await wait(); return readVehicles() },
    async get(id) { await wait(); return readVehicles().find((v) => v.id === id) || null },
    async create(payload) {
      await wait()
      const list = readVehicles()
      const item = { ...payload, id: crypto.randomUUID() }
      localStorage.setItem('patio-vehicles', JSON.stringify([item, ...list]))
      return item
    },
  },
}

export default base44Client
