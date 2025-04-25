import { SelectProduct } from "../schemas/product.schema.ts";

export interface ProductSupplier {
  id: string;
  costPrice: number;
}

// export interface ProductWithSuppliers extends SelectProduct {
//   suppliers: Array<{
//     id: string;
//     name: string;
//     costPrice: number;
//   }>;
// }

export type ProductWithSuppliers = SelectProduct & {
  suppliers: Array<{
    id: string;
    name: string;
    costPrice: number;
  }>;
};
