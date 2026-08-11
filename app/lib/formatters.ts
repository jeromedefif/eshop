import type { OrderItem } from '../types/orders';
import { normalizeProductCategory } from './product-config';

export const formatOrderDisplay = (item: OrderItem) => {
    const { category } = item.product;
    const { quantity, volume } = item;

    const normalizedCategory = normalizeProductCategory(category);
    if (normalizedCategory === 'PET' || normalizedCategory === 'Lahve') {
        return `${quantity}x, balení`;
    }
    if (normalizedCategory === 'Plyny') {
        return `${quantity}x, ${volume === 'maly' ? 'malý' : 'velký'}`;
    }
    return `${quantity}x, ${volume}L`;
};
