/**
 * Generate a product code with the format "NK001", incrementing with the total number of products.
 */
export function generateProductCode(productCount: number): string {
  // Step 2: Generate the next product code by incrementing the count and formatting it
  const nextProductNumber = productCount + 1;
  const productCode = `NK${String(nextProductNumber).padStart(3, "0")}`;

  return productCode;
}
