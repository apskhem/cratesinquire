import NodeCache from "node-cache";

export const crateCache = new NodeCache({ stdTTL: 600, checkperiod: 600 });
export const crateVersionCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 600
});
export const crateVersionDepsCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 600
});

export async function withCache<T>(
  cache: NodeCache,
  cacheId: string,
  fetcherFn: () => Promise<T>
): Promise<T> {
  const cachedData = cache.get<T>(cacheId);

  if (cachedData) {
    return cachedData;
  }

  const data = await fetcherFn();

  crateCache.set(cacheId, data);

  return data;
}
