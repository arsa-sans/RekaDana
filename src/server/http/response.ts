import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

interface SuccessOptions<T> {
  data: T;
  message?: string;
  status?: number;
}

interface ErrorOptions {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
  requestId?: string;
}

export function apiSuccess<T>({ data, message, status = 200 }: SuccessOptions<T>) {
  return NextResponse.json(
    {
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

export function apiError({ code, message, errors, status = 400, requestId }: ErrorOptions) {
  return NextResponse.json(
    {
      code,
      message,
      ...(errors ? { errors } : {}),
      request_id: requestId ?? randomUUID(),
    },
    { status }
  );
}
