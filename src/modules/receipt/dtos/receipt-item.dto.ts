export interface CreateReceiptItemRequestDto {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export interface UpdateReceiptItemRequestDto {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  costPrice: number;
  actualInventory: number;
}
