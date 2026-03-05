import {
  omit,
  pick,
  hasKey,
  objectKeys,
  objectEntries,
  filterObject,
  mapObject,
  deepClone,
  merge,
} from './object-utils';

describe(`Object Utils`, () => {
  describe(`omit`, () => {
    it(`should omit specified keys from object`, () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, `b`, `c`);
      expect(result).toEqual({ a: 1 });
    });

    it(`should return new object without mutating original`, () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, `b`);
      expect(obj).toEqual({ a: 1, b: 2 });
      expect(result).toEqual({ a: 1 });
    });
  });

  describe(`pick`, () => {
    it(`should pick specified keys from object`, () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, `a`, `c`);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it(`should return empty object if no keys specified`, () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj);
      expect(result).toEqual({});
    });
  });

  describe(`hasKey`, () => {
    it(`should return true if key exists`, () => {
      const obj = { name: `John` };
      expect(hasKey(obj, `name`)).toBe(true);
    });

    it(`should return false if key does not exist`, () => {
      const obj = { name: `John` };
      expect(hasKey(obj, `age`)).toBe(false);
    });
  });

  describe(`objectKeys`, () => {
    it(`should return typed keys array`, () => {
      const obj = { name: `John`, age: 30 };
      const keys = objectKeys(obj);
      expect(keys).toEqual([`name`, `age`]);
    });
  });

  describe(`objectEntries`, () => {
    it(`should return typed entries array`, () => {
      const obj = { name: `John`, age: 30 };
      const entries = objectEntries(obj);
      expect(entries).toEqual([
        [`name`, `John`],
        [`age`, 30],
      ]);
    });
  });

  describe(`filterObject`, () => {
    it(`should filter object by predicate`, () => {
      const obj = { name: `John`, age: 30, active: true };
      const result = filterObject(obj, (value) => typeof value === `string`);
      expect(result).toEqual({ name: `John` });
    });

    it(`should return empty object if no values match`, () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = filterObject(obj, (value) => value > 10);
      expect(result).toEqual({});
    });
  });

  describe(`mapObject`, () => {
    it(`should map object values`, () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = mapObject(obj, (value) => value * 2);
      expect(result).toEqual({ a: 2, b: 4, c: 6 });
    });

    it(`should preserve keys`, () => {
      const obj = { apple: 1.5, banana: 0.8 };
      const result = mapObject(obj, (price) => Math.round(price * 100));
      expect(result).toEqual({ apple: 150, banana: 80 });
    });
  });

  describe(`deepClone`, () => {
    it(`should deep clone nested objects`, () => {
      const original = { user: { name: `John`, address: { city: `NYC` } } };
      const cloned = deepClone(original);

      cloned.user.address.city = `LA`;

      expect(original.user.address.city).toBe(`NYC`);
      expect(cloned.user.address.city).toBe(`LA`);
    });

    it(`should handle arrays`, () => {
      const original = { items: [1, 2, 3] };
      const cloned = deepClone(original);

      cloned.items.push(4);

      expect(original.items).toEqual([1, 2, 3]);
      expect(cloned.items).toEqual([1, 2, 3, 4]);
    });

    it(`should handle primitives`, () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone(`hello`)).toBe(`hello`);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });
  });

  describe(`merge`, () => {
    it(`should merge multiple objects`, () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = merge(obj1, obj2);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it(`should handle empty objects`, () => {
      const result = merge({}, { a: 1 }, {});
      expect(result).toEqual({ a: 1 });
    });
  });
});
