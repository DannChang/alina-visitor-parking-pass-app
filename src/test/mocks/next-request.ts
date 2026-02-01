/**
 * NextRequest Mock Factory
 * Creates mock NextRequest objects for API route testing
 */

import { NextRequest } from 'next/server';

interface MockRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  options: MockRequestOptions = {}
): NextRequest {
  const { method = 'GET', body, searchParams = {}, headers = {} } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    urlObj.searchParams.set(key, value);
  }

  // Create request init
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), init);
}

/**
 * Create a mock GET request
 */
export function createMockGetRequest(
  url: string = 'http://localhost:3000/api/test',
  searchParams: Record<string, string> = {},
  headers: Record<string, string> = {}
): NextRequest {
  return createMockRequest(url, { method: 'GET', searchParams, headers });
}

/**
 * Create a mock POST request
 */
export function createMockPostRequest(
  url: string = 'http://localhost:3000/api/test',
  body: unknown = {},
  headers: Record<string, string> = {}
): NextRequest {
  return createMockRequest(url, { method: 'POST', body, headers });
}
