export type SavedOrderTemplateItem = {
  id: string;
  template_id: string;
  product_id: string;
  volume: string;
  quantity: number;
};

export type SavedOrderTemplate = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: SavedOrderTemplateItem[];
};
