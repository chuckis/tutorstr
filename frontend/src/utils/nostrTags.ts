export function getTagValue(tags: string[][], key: string) {
  const tag = tags.find((entry) => entry[0] === key);
  return tag?.[1];
}

export function getTagValues(tags: string[][], key: string) {
  return tags
    .filter((entry) => entry[0] === key && typeof entry[1] === "string")
    .map((entry) => entry[1] as string);
}
