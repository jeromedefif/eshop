import { PrismaClient } from '@prisma/client'

declare global {

  let prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV === 'development') global.prisma = prisma

export default prisma
