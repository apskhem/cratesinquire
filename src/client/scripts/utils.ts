export const getDay = (milsec: number) => {
  return Math.floor(milsec / (1000 * 60 * 60 * 24));
};

export const getTimeDiff = (d1: string, d2: string) => {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();

  return t1 - t2;
};
