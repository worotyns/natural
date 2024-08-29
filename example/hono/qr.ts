interface Meta {
  createAt: number;
  deletedAt: number;
  lastUsedAt: number;
}

interface QR {
  code: string;
  meta: Meta;
}
