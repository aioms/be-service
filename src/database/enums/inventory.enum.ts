export enum InventoryChangeType {
  IMPORT = "IMPORT", // From import receipt
  RETURN = "RETURN", // From return receipt
  CHECK = "CHECK", // From inventory check
  MANUAL = "MANUAL", // Manual adjustment
  SALE = "SALE", // From sale receipt
}
