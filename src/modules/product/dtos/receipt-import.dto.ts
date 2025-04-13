import { ReceiptImportStatus } from "../enums/receipt.enum.ts";
import {
  CreateReceiptItemRequestDto,
  UpdateReceiptItemRequestDto,
} from "./receipt-item.dto.ts";

export interface CreateReceiptImportRequestDto {
  note: string;
  quantity: number;
  totalProduct: number;
  totalAmount: number;
  supplier: string;
  warehouse: string;
  paymentDate: string;
  expectedImportDate: string;
  status: ReceiptImportStatus;
  items: CreateReceiptItemRequestDto[];
}

export interface UpdateReceiptImportRequestDto {
  note: string;
  quantity: number;
  totalProduct: number;
  totalAmount: number;
  supplier: string;
  warehouse: string;
  paymentDate: string;
  expectedImportDate: string;
  status: ReceiptImportStatus;
  items: UpdateReceiptItemRequestDto[];
}
