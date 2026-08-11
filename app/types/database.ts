export interface Product {
    id: string;  // Změněno z number na string pro konzistenci s BigInt serializací
    name: string;
    category: string;
    in_stock: boolean;
    is_archived: boolean;
    archived_at?: string | null;
    is_new: boolean;
    is_featured: boolean;
    sort_priority: number;
    min_order_qty: number;
    // An empty array is used for existing products and means the category default.
    allowed_volumes: string[];
    created_at?: string;
}

// Přidáme pomocné typy pro CRUD operace
export type CreateProductInput = Omit<Product, 'id' | 'created_at'>;
export type UpdateProductInput = Partial<CreateProductInput>;
