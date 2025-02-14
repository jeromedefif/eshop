import type { OrderItem } from '../types/orders';

export const formatOrderDisplay = (item: OrderItem) => {
    const { category } = item.product;
    const { quantity, volume } = item;

    if (category === 'PET') {
        return `${quantity}x, balení`;
    }
    if (category === 'Dusík') {
        return `${quantity}x, ${volume === 'maly' ? 'malý' : 'velký'}`;
    }
    return `${quantity}x, ${volume}L`;
};
