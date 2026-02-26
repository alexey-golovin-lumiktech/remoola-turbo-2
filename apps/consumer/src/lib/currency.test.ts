import { formatCentsToDisplay, formatCurrencyDisplay } from './currency';

describe(`formatCurrencyDisplay`, () => {
  it(`formats USD amount with 2 decimal places`, () => {
    expect(formatCurrencyDisplay(1234.56, `USD`)).toMatch(/\$1[,.]?234[,.]?56/);
  });

  it(`formats zero`, () => {
    expect(formatCurrencyDisplay(0, `USD`)).toMatch(/\$0[,.]?00/);
  });

  it(`uses Intl for locale-aware output`, () => {
    const result = formatCurrencyDisplay(99.5, `USD`);
    expect(result).toContain(`99`);
    expect(result).toContain(`50`); // .5 → .50
  });

  it(`handles small amounts correctly`, () => {
    const result = formatCurrencyDisplay(0.01, `USD`);
    expect(result).toMatch(/0[,.]?01/);
  });
});

describe(`formatCentsToDisplay`, () => {
  it(`converts cents to dollars with 2 decimal places`, () => {
    expect(formatCentsToDisplay(12345, `USD`)).toMatch(/\$123[,.]?45/);
  });

  it(`handles zero cents`, () => {
    expect(formatCentsToDisplay(0, `USD`)).toMatch(/\$0[,.]?00/);
  });

  it(`rounds correctly (cents are integer, no floating point in input)`, () => {
    expect(formatCentsToDisplay(100, `USD`)).toMatch(/\$1[,.]?00/);
    expect(formatCentsToDisplay(199, `USD`)).toMatch(/\$1[,.]?99/);
  });
});
