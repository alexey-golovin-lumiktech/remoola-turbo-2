import { type ClassConstructor, plainToInstance } from 'class-transformer';
import _ from 'lodash';

export const stringify = (obj: object) => JSON.stringify(obj, null, -1);
export const parse = (str: string) => JSON.parse(str);
export const encode = (str: string) => Buffer.from(str).toString(`base64`);
export const decode = (str: string) => Buffer.from(str, `base64`).toString(`utf-8`);
export const toBase64 = (obj: object) => encode(stringify(obj));
export const fromBase64 = <T = Record<string, string>>(state: string): T => parse(decode(state));

export const camelizeKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => camelizeKeys(v));
  } else if (obj != null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [_.camelCase(key)]: camelizeKeys(obj[key]),
      }),
      {},
    );
  }
  return obj;
};

export const convertPlainToInstance = <ClassDTO>(classDTO: ClassConstructor<ClassDTO>, raw: unknown) => {
  const options = {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  };
  return plainToInstance(classDTO, raw, options);
};
