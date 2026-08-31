/** Instancias Nitter — se prueban en orden hasta que una responda */
export const NITTER_INSTANCES = [
  "https://nitter.cz",
  "https://nitter.tiekoetter.com",
  "https://nitter.poast.org",
  "https://nitter.privacydev.net",
];

export function buildNitterRssUrls(username: string): string[] {
  return NITTER_INSTANCES.map(
    (base) => `${base}/${username}/rss`
  );
}
