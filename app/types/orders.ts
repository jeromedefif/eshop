import type { Product } from './database';
import type { User } from '@supabase/supabase-js';

// Základní typy pro objednávky
export interface OrderItem {
    id: string;
    order_id: string;
    product_id: number;
    quantity: number;
    volume: string;
    product: Product;
}

export interface Order {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string | null;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_company: string | null;
    total_volume: string;
    status: 'pending' | 'confirmed' | 'completed';
    note: string | null;
    order_items: OrderItem[];
}

// Typy pro košík
export type CartItems = { [key: string]: number };

// Typy pro profil
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    company: string | null;
    phone: string | null;
}

// Typy pro OrderForm
export interface OrderFormProps {
    cartItems: CartItems;
    products: Product[];
    onRemoveFromCart: (productId: number, volume: string | number) => void;
    onAddToCart: (productId: number, volume: string | number) => void;
    onClearCart: () => void;
    totalVolume: number;
    user: User | null;
    profile: UserProfile | null;
}

// Typy pro OrderConfirmationDialog
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface OrderCustomer {
    name: string;
    email: string;
    phone: string;
    company?: string;
    note?: string;
}

export interface OrderConfirmationItem {
    productName: string;
    volume: string | number;
    quantity: number;
    display: string;
}

export interface OrderConfirmationData {
    items: OrderConfirmationItem[];
    totalVolume: number;
    customer: OrderCustomer;
}

// Props typy pro komponenty
export interface OrderDetailProps {
    order: Order;
    onClose: () => void;
}

export interface AdminOrdersProps {
    orders: Order[];
    onExportOrders: () => Promise<void>;
}

export interface OrderConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    orderData: OrderConfirmationData;
    orderStatus: OrderStatus;
}

// Helper typy pro API
export type CreateOrderInput = Omit<Order, 'id' | 'created_at' | 'updated_at'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id'>>;

// Helper typ pro DB operace
export interface OrderCreateData {
    user_id: string;
    total_volume: number;
    customer_name: string | null;
    customer_email: string;
    customer_phone: string | null;
    customer_company: string | null;
    note: string;
    status: 'pending';
}

// Product form typy
export interface ProductFormData {
    name: string;
    category: string;
    in_stock: boolean;
}

export interface EditFormProps {
    product: Product;
    onSave: (formData: ProductFormData) => void;
    onCancel: () => void;
    isLoading: boolean;
}

export interface AddProductFormProps {
    onSave: (formData: ProductFormData) => void;
    onCancel: () => void;
    isLoading: boolean;
}
