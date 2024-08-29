import type { NamespacedIdentity } from "../../atom.ts";

interface Team {
  name: string;
  nsid: NamespacedIdentity;
  role: number;
}

interface Meta {
  createdAt: number;
  lastLoginAt: number;
  deletedAt: number;
  activatedAt: number;
}

interface User {
  email: string;
  name: string;
  meta: Meta;
  teams: Team[];
}

