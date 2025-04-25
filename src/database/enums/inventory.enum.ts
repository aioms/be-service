export enum InventoryChangeType {
  IMPORT = "IMPORT", // From import receipt
  RETURN = "RETURN", // From return receipt
  CHECK = "CHECK", // From inventory check
  MANUAL = "MANUAL", // Manual adjustment
  SYSTEM = "SYSTEM", // System adjustment
  SALE = "SALE", // From sale receipt (negative inventory change)
}

export enum TopStockSortBy {
  INVENTORY = "inventory",
  VALUE = "value",
}
