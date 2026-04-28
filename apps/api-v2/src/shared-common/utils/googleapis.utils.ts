const parse = (str: string) => JSON.parse(str);
const decode = (str: string) => Buffer.from(str, `base64`).toString(`utf-8`);

export const fromBase64 = <T = Record<string, string>>(state: string): T => parse(decode(state));
