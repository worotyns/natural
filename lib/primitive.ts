// basic primitive types, used for serialization, deserialization before persist
export enum PrimitiveKind {
  Identity,
  Atom,
  Molecule,
  Cell,
}

// value cannot be nullable, if it's null, we should not store them, null as default
export enum PrimitiveValue {
  String,
  Number,
  Boolean,
  Date,
  Object,
  List,
  Map,
  // collection of atoms
  Collection,
}
