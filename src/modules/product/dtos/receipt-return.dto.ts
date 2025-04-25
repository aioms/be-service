import { ReceiptReturnStatus } from "../../receipt/enums/receipt.enum.ts";
import {
  CreateReceiptItemRequestDto,
  UpdateReceiptItemRequestDto,
} from "./receipt-item.dto.ts";

export interface CreateReceiptReturnRequestDto {
  name: string;
  note: string;
  quantity: number;
  totalProduct: number;
  totalAmount: number;
  reason: string;
  warehouse: string;
  supplier: string;
  type: string;
  status: ReceiptReturnStatus;
  returnDate: string;
  items: CreateReceiptItemRequestDto[];
}

export interface UpdateReceiptReturnRequestDto {
  name: string;
  note: string;
  quantity: number;
  totalProduct: number;
  totalAmount: number;
  reason: string;
  warehouse: string;
  supplier: string;
  status: ReceiptReturnStatus;
  returnDate: string;
  items: UpdateReceiptItemRequestDto[];
}
