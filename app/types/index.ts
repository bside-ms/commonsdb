export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  skip: number;
  take: number;
}
