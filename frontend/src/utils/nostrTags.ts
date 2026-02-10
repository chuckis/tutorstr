export function getTagValue(tags: string[][], key: string) {
  const tag = tags.find((entry) => entry[0] === key);
  return tag?.[1];
}
