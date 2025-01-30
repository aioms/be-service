import { ReceiptCheckStatus } from "../enums/receipt.enum.ts";
import {
  CreateReceiptItemRequestDto,
  UpdateReceiptItemRequestDto,
} from "./receipt-item.dto.ts";

export interface CreateReceiptCheckRequestDto {
  supplier: string;
  periodic: string;
  date: string;
  checker: string;
  note: string;
  items: CreateReceiptItemRequestDto[];
}

export interface UpdateReceiptCheckRequestDto {
  note: string;
  periodic: string;
  supplier: string;
  checker: string;
  date: string;
  status: ReceiptCheckStatus;
  items: UpdateReceiptItemRequestDto[];
}
