export const splitToChunks = <T>(array: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  const amount = array.length;
  for (let i = 0; i < amount; i += chunkSize) chunks.push(array.slice(i, i + chunkSize));
  return chunks;
};
