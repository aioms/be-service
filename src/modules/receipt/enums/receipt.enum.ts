export enum ReceiptImportStatus {
  DRAFT = "draft",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  SHORT_RECEIVED = "short_received",
  OVER_RECEIVED = "over_received",
}

export enum ReceiptReturnStatus {
  DRAFT = "draft",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ReceiptCheckStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  BALANCING_REQUIRED = "balancing_required",
  BALANCELLED = "balanced",
}

export enum ReceiptReturnType {
  CUSTOMER = "customer",
  SUPPLIER = "supplier",
}
