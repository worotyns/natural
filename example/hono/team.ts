import type { NamespacedIdentity } from "../../mod.ts";

interface Meta {
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

interface MemberMeta {
  state: "invited" | "joined"
  joinedAt: number
  invitedBy: NamespacedIdentity
}

interface Member {
  role: number;
  name: string;
  nsid: NamespacedIdentity;
  meta: MemberMeta
}

interface Team {
  name: string;
  meta: Meta;
  members: Member[];
}
