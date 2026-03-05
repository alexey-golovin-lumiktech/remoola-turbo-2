/**
 * Object utility functions for type-safe object manipulation
 *
 * These utilities provide type-safe ways to work with objects,
 * maintaining TypeScript inference throughout.
 */

/**
 * Omits specified keys from an object
 *
 * @example
 * const user = { id: 1, name: 'John', password: 'secret' };
 * const safeUser = omit(user, 'password'); // { id: 1, name: 'John' }
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Picks specified keys from an object
 *
 * @example
 * const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
 * const publicUser = pick(user, 'id', 'name'); // { id: 1, name: 'John' }
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

/**
 * Checks if an object has a specific key
 * Type guard for safe property access
 *
 * @example
 * const obj = { name: 'John' };
 * if (hasKey(obj, 'name')) {
 *   console.log(obj.name); // TypeScript knows 'name' exists
 * }
 */
export function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

/**
 * Type-safe Object.keys with proper typing
 * Returns keys as array of the object's keys (not just string[])
 *
 * @example
 * const obj = { name: 'John', age: 30 };
 * const keys = objectKeys(obj); // ('name' | 'age')[]
 */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe Object.entries with proper typing
 *
 * @example
 * const obj = { name: 'John', age: 30 };
 * const entries = objectEntries(obj); // [['name', 'John'], ['age', 30]]
 */
export function objectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Filters an object by a predicate function
 *
 * @example
 * const user = { name: 'John', age: 30, active: true };
 * const onlyStrings = filterObject(user, (value) => typeof value === 'string');
 * // { name: 'John' }
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (predicate(obj[key], key)) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

/**
 * Maps object values while preserving keys
 *
 * @example
 * const prices = { apple: 1.5, banana: 0.8 };
 * const cents = mapObject(prices, (price) => Math.round(price * 100));
 * // { apple: 150, banana: 80 }
 */
export function mapObject<T extends Record<string, unknown>, U>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = mapper(obj[key], key);
    }
  }
  return result;
}

/**
 * Deep clones an object (simple implementation for plain objects)
 * Note: Does not handle circular references, functions, or special objects
 *
 * @example
 * const original = { user: { name: 'John' } };
 * const cloned = deepClone(original);
 * cloned.user.name = 'Jane'; // original.user.name is still 'John'
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== `object`) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Merges multiple objects (shallow merge)
 * Later objects override earlier ones
 *
 * @example
 * const defaults = { theme: 'light', lang: 'en' };
 * const user = { theme: 'dark' };
 * const config = merge(defaults, user); // { theme: 'dark', lang: 'en' }
 */
export function merge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
  return Object.assign({}, ...objects) as T;
}
