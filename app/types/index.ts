// export interface Assignment {
//   id: string;
//   title: string;
//   status: string;
//   description: string;
//   reward: number;
// }

// export interface User {
//   id: string;
//   status: string;
//   username: string;
//   email: string;
//   firstname?: string | null;
//   lastname?: string | null;
//   bio?: string | null;
//   visibility: string;
//   wallet?: Wallet | null;
// }

// export interface Wallet {
//   id: string;
//   balance?: number | null;
//   transactions?: WalletTransaction[] | null;
// }

// export interface WalletTransaction {
//   id: string;
//   type: string;
//   amount: number;
//   comment?: string | null;
//   createdAt?: any | null;
//   updatedAt?: any | null;
// }

// export interface TaskCategory {
//   id: string;
//   name: string;
//   parent?: TaskCategory | null;
// }

// export interface Task {
//   id?: string;
//   title: string;
//   description?: string | null;
//   priority: TaskPriority | string;
//   expense: number;
//   factor: number;
//   due?: Date | null;
//   categories?: TaskCategory[] | null;
//   type?: string | null;
//   status: TaskStatus | string;
//   repeat?: TaskRepeat | string | null;
//   parent?: Partial<Task> | null;
//   series?: Partial<Task>[] | null;
// }

// export interface Link {
//   id?: string;
//   label: string;
//   url: string;
// }

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  skip: number;
  take: number;
}
