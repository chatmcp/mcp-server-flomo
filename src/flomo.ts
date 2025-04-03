/**
 * Flomo client used to interact with the Flomo API.
 */
export class FlomoClient {
  private readonly apiUrl: string;

  /**
   * Create a new Flomo client.
   * @param apiUrl - The API URL of the Flomo API.
   */
  constructor({ apiUrl }: { apiUrl: string }) {
    this.apiUrl = apiUrl;
  }

  /**
   * Write a note to Flomo.
   * @param content - The content of the note.
   * @returns The response from the Flomo API.
   */
  async writeNote({ content }: { content: string }) {
    try {
      if (!content) {
        throw new Error("invalid content");
      }

      const req = {
        content,
      };

      const resp = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status ${resp.statusText}`);
      }

      let result = await resp.json();

      if (result && result.memo && result.memo.slug) {
        const memoUrl = `https://v.flomoapp.com/mine/?memo_id=${result.memo.slug}`;
        result.memo.url = memoUrl;
      }

      return result;
    } catch (e) {
      throw e;
    }
  }
}
