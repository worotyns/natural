interface Meta {
  retries: number;
  lastCallAt: number;
  lastError: string;
  createdAt: number;
  expiresAt: number;
}
interface Webhook {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  meta: Meta
}