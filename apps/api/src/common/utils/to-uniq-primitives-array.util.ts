export const toUniqPrimitivesArray = <T>(primitives: T[]): NonNullable<T>[] => {
  const primitivesSet = new Set(primitives);
  return Array.from(primitivesSet).filter((x) => x != undefined && x != null);
};
