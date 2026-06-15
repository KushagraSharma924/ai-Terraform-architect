// ─── Standard error envelope returned by all services ─────────────────────────

export interface ApiErrorResponse {
  /** Machine-readable error code, e.g. "VALIDATION_ERROR" */
  error: string;
  /** Human-readable description */
  message?: string;
  /** Field-level validation details */
  details?: Array<{ field: string; message: string }>;
  /** Unique request ID for tracing */
  requestId?: string;
}

// ─── Generic success wrapper (optional, used for simple responses) ─────────────

export interface ApiSuccessResponse<T = void> {
  data?: T;
  message?: string;
}
