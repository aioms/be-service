export interface PaginationParams {
  page: number;
  limit: number;
}

export type PaginationResult = {
  offset: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
