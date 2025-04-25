import { customAlphabet } from "nanoid";

/**
 * Generate a supplier code with the format "NCC001", incrementing with the total number of suppliers.
 */
export function generateSupplierCode(size: number = 10): string {
  const supplierCode = `NCC${customAlphabet("1234567890", size)()}`;
  return supplierCode;
}
