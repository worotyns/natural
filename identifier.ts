export type IdentityRaw = string;
export type IdentityItem = string;
export type Identity = IdentityItem[];

// Combine arrays of identities (helper for child creation)
export const combine = (...identity: (Identity | IdentityItem)[]): Identity => {
  return identity.flat() as Identity;
};

// Transform array of identities to string
export const serialize = (identity: Identity): IdentityRaw => {
  return identity.flat().join(":");
};

// Transform string identity to array
export const deserialize = (identity: IdentityRaw): Identity => {
  return identity.split(":");
};
