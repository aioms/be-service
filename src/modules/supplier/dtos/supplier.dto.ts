import { SupplierStatus } from "../enums/supplier.enum.ts";

export interface CreateSupplierRequestDto {
  name: string;
  email: string;
  phone: string;
  company: string;
  taxCode: string;
  address: string;
  note: string;
  status: SupplierStatus;
}

export interface UpdateSupplierRequestDto {
  name: string;
  email: string;
  phone: string;
  company: string;
  taxCode: string;
  address: string;
  note: string;
  status: SupplierStatus;
}
