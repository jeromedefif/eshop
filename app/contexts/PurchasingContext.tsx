'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { CartItems } from '@/contexts/CartContext';
import type { SavedOrderTemplate } from '@/types/purchasing';

type PurchasingContextValue = {
  favoriteProductIds: Set<string>;
  templates: SavedOrderTemplate[];
  isLoading: boolean;
  toggleFavorite: (productId: string | number) => Promise<void>;
  createTemplate: (name: string, items: CartItems) => Promise<void>;
  renameTemplate: (templateId: string, name: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const PurchasingContext = createContext<PurchasingContextValue | null>(null);

type FavoriteRow = { product_id: string | number };
type TemplateItemRow = Omit<SavedOrderTemplate['items'][number], 'product_id'> & {
  product_id: string | number;
};
type TemplateRow = Omit<SavedOrderTemplate, 'items'> & { items: TemplateItemRow[] | null };

const normalizeName = (name: string) => {
  const normalized = name.trim();
  if (!normalized) throw new Error('Zadejte název šablony.');
  if (normalized.length > 80) throw new Error('Název může mít maximálně 80 znaků.');
  return normalized;
};

export function PurchasingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<SavedOrderTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavoriteIds([]);
      setTemplates([]);
      return;
    }

    setIsLoading(true);
    try {
      const [favoritesResult, templatesResult] = await Promise.all([
        supabase.from('favorite_products').select('product_id').eq('user_id', user.id),
        supabase
          .from('saved_order_templates')
          .select(`
            id,
            name,
            created_at,
            updated_at,
            items:saved_order_template_items (
              id,
              template_id,
              product_id,
              volume,
              quantity
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
      ]);

      if (favoritesResult.error) throw favoritesResult.error;
      if (templatesResult.error) throw templatesResult.error;

      const favoriteRows = (favoritesResult.data || []) as FavoriteRow[];
      const templateRows = (templatesResult.data || []) as TemplateRow[];
      setFavoriteIds(favoriteRows.map((item) => String(item.product_id)));
      setTemplates(templateRows.map((template) => ({
        ...template,
        items: (template.items || []).map((item) => ({
          ...item,
          product_id: String(item.product_id)
        }))
      })));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh().catch((error) => console.error('Error loading purchasing data:', error));
  }, [refresh]);

  const toggleFavorite = useCallback(async (productId: string | number) => {
    if (!user) throw new Error('Pro oblíbené položky se nejprve přihlaste.');
    const id = String(productId);
    const isFavorite = favoriteIds.includes(id);

    setFavoriteIds((current) => isFavorite ? current.filter((item) => item !== id) : [...current, id]);

    const result = isFavorite
      ? await supabase.from('favorite_products').delete().eq('user_id', user.id).eq('product_id', id)
      : await supabase.from('favorite_products').insert({ user_id: user.id, product_id: id });

    if (result.error) {
      setFavoriteIds((current) => isFavorite ? [...current, id] : current.filter((item) => item !== id));
      throw result.error;
    }
  }, [favoriteIds, user]);

  const createTemplate = useCallback(async (name: string, items: CartItems) => {
    if (!user) throw new Error('Pro uložení šablony se nejprve přihlaste.');
    const entries = Object.entries(items).filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) throw new Error('Prázdný košík nelze uložit jako šablonu.');

    const { data: template, error: templateError } = await supabase
      .from('saved_order_templates')
      .insert({ user_id: user.id, name: normalizeName(name) })
      .select('id')
      .single();

    if (templateError) {
      if (templateError.code === '23505') throw new Error('Šablona s tímto názvem již existuje.');
      throw templateError;
    }

    const templateItems = entries.map(([key, quantity]) => {
      const separator = key.lastIndexOf('-');
      return {
        template_id: template.id,
        user_id: user.id,
        product_id: key.slice(0, separator),
        volume: key.slice(separator + 1),
        quantity
      };
    });

    const { error: itemsError } = await supabase.from('saved_order_template_items').insert(templateItems);
    if (itemsError) {
      await supabase.from('saved_order_templates').delete().eq('id', template.id).eq('user_id', user.id);
      throw itemsError;
    }

    await refresh();
  }, [refresh, user]);

  const renameTemplate = useCallback(async (templateId: string, name: string) => {
    if (!user) throw new Error('Nejste přihlášeni.');
    const { error } = await supabase
      .from('saved_order_templates')
      .update({ name: normalizeName(name), updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('user_id', user.id);
    if (error) throw error;
    await refresh();
  }, [refresh, user]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!user) throw new Error('Nejste přihlášeni.');
    const { error } = await supabase
      .from('saved_order_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);
    if (error) throw error;
    setTemplates((current) => current.filter((template) => template.id !== templateId));
  }, [user]);

  const value = useMemo(() => ({
    favoriteProductIds: new Set(favoriteIds),
    templates,
    isLoading,
    toggleFavorite,
    createTemplate,
    renameTemplate,
    deleteTemplate,
    refresh
  }), [createTemplate, deleteTemplate, favoriteIds, isLoading, refresh, renameTemplate, templates, toggleFavorite]);

  return <PurchasingContext.Provider value={value}>{children}</PurchasingContext.Provider>;
}

export function usePurchasing() {
  const context = useContext(PurchasingContext);
  if (!context) throw new Error('usePurchasing must be used within PurchasingProvider');
  return context;
}
