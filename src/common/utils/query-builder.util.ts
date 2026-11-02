/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IPaginationMeta } from '../interfaces/response.interface.js';

export interface NestedFilter {
  field: string;
  filterField: string;
  queryKey: string;
}

export interface RangeFilterParams {
  field: string;
  minQueryKey?: string;
  maxQueryKey?: string;
  dataType?: 'date' | 'number' | 'string';
}

export interface FilterOptions {
  exacts?: string[];
  booleans?: string[];
  dates?: string[];
  ranges?: RangeFilterParams[];
  exclude?: string[];
}

export class QueryBuilder<
  Model extends {
    findMany: (...args: any) => Promise<any[]>;
    count: (...args: any) => Promise<number>;
  },
> {
  private prismaQuery: Record<string, any> = {};

  constructor(
    private readonly model: Model,
    private readonly query: Record<string, any> = {},
  ) {
    this.prismaQuery = {
      where: {},
      orderBy: [],
    };
  }

  /**
   * Add full-text or substring search across multiple string fields using query 'search' or 'searchTerm' or 'q'.
   */
  search(fields: string[]): this {
    const searchTerm =
      this.query.search || this.query.searchTerm || this.query.q;

    if (searchTerm && typeof searchTerm === 'string' && fields.length > 0) {
      const orConditions = fields.map((field) => {
        if (field.includes('.')) {
          const parts = field.split('.');
          let nestedObj: Record<string, any> = {
            contains: searchTerm,
            mode: 'insensitive',
          };
          for (let i = parts.length - 1; i >= 0; i--) {
            nestedObj = { [parts[i]]: nestedObj };
          }
          return nestedObj;
        }
        return {
          [field]: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        };
      });

      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        OR: orConditions,
      };
    }

    return this;
  }

  /**
   * Filter records by exact values, booleans, dates, and ranges.
   */
  filter({
    exacts = [],
    booleans = [],
    dates = [],
    ranges = [],
    exclude = [],
  }: FilterOptions = {}): this {
    const rangeKeys: string[] = [];
    for (const r of ranges) {
      if (r.minQueryKey) rangeKeys.push(r.minQueryKey);
      if (r.maxQueryKey) rangeKeys.push(r.maxQueryKey);
    }

    const systemExclude = new Set([
      'search',
      'searchTerm',
      'q',
      'page',
      'limit',
      'sort',
      'sortBy',
      'sortOrder',
      'order',
      'fields',
      'include',
      'select',
      ...rangeKeys,
      ...exclude,
    ]);

    const where: Record<string, any> = { ...this.prismaQuery.where };

    // 1. Exact matches
    for (const key of exacts) {
      if (this.query[key] !== undefined && this.query[key] !== '') {
        where[key] = this.query[key];
      }
    }

    // Dynamic exact matches for any other query param not excluded
    for (const [key, value] of Object.entries(this.query)) {
      if (
        !systemExclude.has(key) &&
        !exacts.includes(key) &&
        !booleans.includes(key) &&
        !dates.includes(key) &&
        value !== undefined &&
        value !== ''
      ) {
        where[key] = value;
      }
    }

    // 2. Boolean values ('true'/'false' or boolean)
    for (const key of booleans) {
      if (this.query[key] !== undefined) {
        const val = this.query[key];
        where[key] = val === true || val === 'true' || val === '1';
      }
    }

    // 3. Date matches
    for (const key of dates) {
      if (this.query[key]) {
        where[key] = new Date(this.query[key]);
      }
    }

    // 4. Range filters (e.g., price between minPrice and maxPrice)
    for (const range of ranges) {
      const condition: Record<string, any> = {};
      if (range.minQueryKey && this.query[range.minQueryKey] !== undefined) {
        const minVal = this.query[range.minQueryKey];
        condition.gte =
          range.dataType === 'date'
            ? new Date(minVal)
            : range.dataType === 'number'
              ? Number(minVal)
              : minVal;
      }
      if (range.maxQueryKey && this.query[range.maxQueryKey] !== undefined) {
        const maxVal = this.query[range.maxQueryKey];
        condition.lte =
          range.dataType === 'date'
            ? new Date(maxVal)
            : range.dataType === 'number'
              ? Number(maxVal)
              : maxVal;
      }
      if (Object.keys(condition).length > 0) {
        where[range.field] = condition;
      }
    }

    this.prismaQuery.where = where;
    return this;
  }

  /**
   * Apply nested relation filter (e.g. category.slug = query.category).
   */
  nestedFilter(filters: NestedFilter[]): this {
    for (const { field, filterField, queryKey } of filters) {
      const value = this.query[queryKey];
      if (value !== undefined && value !== null && value !== '') {
        this.prismaQuery.where[field] = {
          ...this.prismaQuery.where[field],
          [filterField]: value,
        };
      }
    }
    return this;
  }

  /**
   * Apply raw/explicit Prisma where conditions (e.g. { isActive: true, deletedAt: null }).
   */
  rawFilter(conditions: Record<string, any>): this {
    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...conditions,
    };
    return this;
  }

  /**
   * Configure ordering based on 'sortBy' and 'sortOrder', or 'sort' comma-separated string (-createdAt, name).
   */
  sort(defaultSort: string = 'createdAt:desc'): this {
    const orderByList: Array<Record<string, 'asc' | 'desc'>> = [];

    if (this.query.sortBy) {
      const order =
        String(this.query.sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
      orderByList.push({ [this.query.sortBy]: order });
    } else if (this.query.sort || this.query.order) {
      const sortParam = String(this.query.sort || this.query.order);
      const fields = sortParam.split(',');
      for (const field of fields) {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          orderByList.push({ [trimmed.substring(1)]: 'desc' });
        } else if (trimmed.includes(':')) {
          const [key, dir] = trimmed.split(':');
          orderByList.push({
            [key]: dir.toLowerCase() === 'asc' ? 'asc' : 'desc',
          });
        } else {
          orderByList.push({ [trimmed]: 'asc' });
        }
      }
    } else if (defaultSort) {
      if (defaultSort.includes(':')) {
        const [key, dir] = defaultSort.split(':');
        orderByList.push({
          [key]: dir.toLowerCase() === 'asc' ? 'asc' : 'desc',
        });
      } else if (defaultSort.startsWith('-')) {
        orderByList.push({ [defaultSort.substring(1)]: 'desc' });
      } else {
        orderByList.push({ [defaultSort]: 'asc' });
      }
    }

    if (orderByList.length > 0) {
      this.prismaQuery.orderBy = orderByList;
    }

    return this;
  }

  /**
   * Apply pagination options (page, limit, skip, take).
   */
  paginate(defaultLimit = 10, maxLimit = 100): this {
    const page = Math.max(1, Number(this.query.page) || 1);
    let limit = Math.max(1, Number(this.query.limit) || defaultLimit);
    if (limit > maxLimit) limit = maxLimit;

    const skip = (page - 1) * limit;

    this.prismaQuery.skip = skip;
    this.prismaQuery.take = limit;

    return this;
  }

  /**
   * Include relation fields in the query.
   */
  include(includeArgs: Record<string, any>): this {
    this.prismaQuery.include = includeArgs;
    return this;
  }

  /**
   * Select specific fields in the query.
   */
  select(selectArgs: Record<string, any>): this {
    this.prismaQuery.select = selectArgs;
    return this;
  }

  /**
   * Retrieve total record count matching the current filters.
   */
  async countTotal(): Promise<IPaginationMeta> {
    const page = Math.max(1, Number(this.query.page) || 1);
    const limit = Math.max(1, Number(this.query.limit) || 10);

    const total = await this.model.count({
      where: this.prismaQuery.where,
    });

    const totalPage = Math.ceil(total / limit) || 1;

    return {
      page,
      limit,
      total,
      totalPage,
    };
  }

  /**
   * Execute the query and return the matching records.
   */
  async execute<T = any>(extraOptions: Record<string, any> = {}): Promise<T[]> {
    const query = this.cleanQuery({
      ...this.prismaQuery,
      ...extraOptions,
    });
    return this.model.findMany(query) as Promise<T[]>;
  }

  /**
   * Convenient helper: run findMany and count concurrently and return data with pagination metadata.
   */
  async paginateAndExecute<T = any>(
    extraOptions: Record<string, any> = {},
  ): Promise<{ meta: IPaginationMeta; data: T[] }> {
    const [data, meta] = await Promise.all([
      this.execute<T>(extraOptions),
      this.countTotal(),
    ]);

    return {
      meta,
      data,
    };
  }

  /**
   * Remove empty or undefined query keys.
   */
  private cleanQuery(query: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0
        ) {
          continue;
        }
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
