import { NextResponse } from 'next/server';

export function jsonResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function success<T>(data: T, status = 200) {
  return jsonResponse({ success: true, data }, { status });
}

export function failure(message: string, status = 400, details?: unknown) {
  return jsonResponse({ success: false, message, details }, { status });
}