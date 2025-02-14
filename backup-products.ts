import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function backupProducts() {
    try {
        console.log('Starting products backup...')
        const products = await prisma.product.findMany()
        console.log(`Found ${products.length} products`)

        fs.writeFileSync('products-backup.json', JSON.stringify(products, null, 2))
        console.log('Backup saved to products-backup.json')
    } catch (error) {
        console.error('Error during backup:', error)
    } finally {
        await prisma.$disconnect()
    }
}

backupProducts()
