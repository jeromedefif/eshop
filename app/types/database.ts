export interface Product {
    id: string;  // Změněno z number na string pro konzistenci s BigInt serializací
    name: string;
    category: string;
    in_stock: boolean;
    created_at?: string;
}

// Přidáme pomocné typy pro CRUD operace
export type CreateProductInput = Omit<Product, 'id' | 'created_at'>;
export type UpdateProductInput = Partial<CreateProductInput>;
