import type { IGenericErrorMessage } from './error.interface.js';

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IGenericResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  meta?: IPaginationMeta;
  data: T;
}

export interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  errorMessages: IGenericErrorMessage[];
}

export interface ResponseParams<T> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  meta?: IPaginationMeta;
  data?: T | null;
}
