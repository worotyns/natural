interface Meta {
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

interface Team {
  name: string;
  meta: Meta;
}