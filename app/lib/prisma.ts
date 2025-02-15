import { PrismaClient } from '@prisma/client'

// Deklarace pro globální prostor
declare global {
  var prisma: PrismaClient | undefined
}

// Vytvoření instance Prisma klienta
const prisma = globalThis.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

// Nastavení globální instance v development módu
if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma

export default prisma
