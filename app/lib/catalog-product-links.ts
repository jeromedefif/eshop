export const MAX_LINKED_PRODUCTS = 20;
export const ORDER_CATALOG_URL = 'https://www.beginy.cz';

export function normalizeCatalogProductIds(values: Array<string | number | bigint | null | undefined>) {
  return Array.from(new Set(values
    .map((value) => String(value ?? '').trim())
    .filter((value) => /^\d+$/.test(value))))
    .slice(0, MAX_LINKED_PRODUCTS);
}

export function readCatalogProductIds(searchParams: URLSearchParams) {
  const multiple = searchParams.get('produkty');
  if (multiple) return normalizeCatalogProductIds(multiple.split(','));

  const single = searchParams.get('produkt');
  return single ? normalizeCatalogProductIds([single]) : [];
}

export function setCatalogProductIds(url: URL, productIds: Array<string | number | bigint>) {
  const normalized = normalizeCatalogProductIds(productIds);
  url.searchParams.delete('produkt');
  url.searchParams.delete('produkty');

  if (normalized.length === 1) {
    url.searchParams.set('produkt', normalized[0]);
  } else if (normalized.length > 1) {
    url.searchParams.set('produkty', normalized.join(','));
  }

  return url;
}

export function buildOrderCatalogUrl(productIds: Array<string | number | bigint>, baseUrl = ORDER_CATALOG_URL) {
  const url = new URL('/', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  return setCatalogProductIds(url, productIds).toString();
}
