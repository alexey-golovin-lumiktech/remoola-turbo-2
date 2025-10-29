export const stringify = (obj: object) => JSON.stringify(obj, null, -1);
export const encode = (str: string) => Buffer.from(str).toString(`base64`);
export const toBase64 = (obj: object) => encode(stringify(obj));

export const decode = (str: string) => Buffer.from(str, `base64`).toString(`utf-8`);
export const parse = (str: string) => JSON.parse(str);
export const fromBase64 = <T = Record<string, string>>(state: string): T => parse(decode(state));
