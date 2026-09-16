function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function snakeToCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[toCamel(key)] = snakeToCamel(value);
  }
  return result as T;
}

export function camelToSnake<T>(obj: unknown): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnake(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[toSnake(key)] = camelToSnake(value);
  }
  return result as T;
}
