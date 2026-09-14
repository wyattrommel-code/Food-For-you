// Discovery metadata should not be presented as recipe badges.
const DISCOVERY_TAGS = new Set(['smoothies-and-shakes', 'treat-cold', 'treat-hot']);
export function visibleRecipeTags(tags: string[]) {
  return tags.filter(tag => !DISCOVERY_TAGS.has(tag));
}
