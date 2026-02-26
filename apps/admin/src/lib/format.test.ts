import { formatAmount } from './format';

describe(`formatAmount`, () => {
  it(`formats amount string as USD by default`, () => {
    const result = formatAmount(`1234.56`);
    expect(result).toMatch(/\$1[,.]?234[,.]?56/);
  });

  it(`parses string and uses 2 decimal places for USD`, () => {
    const result = formatAmount(`99.5`, `USD`);
    expect(result).toContain(`99`);
    expect(result).toContain(`50`);
  });

  it(`handles zero`, () => {
    const result = formatAmount(`0`);
    expect(result).toMatch(/\$0[,.]?00/);
  });

  it(`accepts explicit currency`, () => {
    const result = formatAmount(`100`, `EUR`);
    expect(result).toContain(`100`);
  });
});
