import { describe, expect, it } from 'vitest';
import { getPagination, paginationMeta } from '../../src/utils/pagination.js';

describe('pagination', () => {
  it('applies defaults', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps page, limit and computes skip', () => {
    expect(getPagination({ page: '3', limit: '1000' })).toEqual({
      page: 3,
      limit: 100,
      skip: 200,
    });
    expect(getPagination({ page: 0, limit: 0 })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('returns page metadata including the zero-total case', () => {
    expect(paginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      pages: 3,
    });
    expect(paginationMeta({ page: 1, limit: 10, total: 0 })).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    });
  });
});
