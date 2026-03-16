import {
  addUtcMonths,
  parsePartitionMonthStart,
  quoteIdentifier,
  startOfMonth,
  toPartitionName,
} from './consumer-action-log-partition.util';

describe(`consumer_action_log partition utils`, () => {
  it(`normalizes to UTC month start`, () => {
    const d = new Date(`2026-03-16T17:28:45.123Z`);
    expect(startOfMonth(d).toISOString()).toBe(`2026-03-01T00:00:00.000Z`);
  });

  it(`adds UTC months deterministically`, () => {
    const d = new Date(`2026-12-01T00:00:00.000Z`);
    expect(addUtcMonths(d, 2).toISOString()).toBe(`2027-02-01T00:00:00.000Z`);
  });

  it(`builds and parses partition names`, () => {
    const monthStart = new Date(`2026-04-01T00:00:00.000Z`);
    const partitionName = toPartitionName(monthStart);
    expect(partitionName).toBe(`consumer_action_log_p202604`);
    expect(parsePartitionMonthStart(partitionName)?.toISOString()).toBe(`2026-04-01T00:00:00.000Z`);
  });

  it(`returns null for unknown partition names`, () => {
    expect(parsePartitionMonthStart(`not_a_partition`)).toBeNull();
    expect(parsePartitionMonthStart(`consumer_action_log_p202613`)).toBeNull();
  });

  it(`quotes SQL identifiers safely`, () => {
    expect(quoteIdentifier(`consumer_action_log_p202604`)).toBe(`"consumer_action_log_p202604"`);
    expect(quoteIdentifier(`weird"name`)).toBe(`"weird""name"`);
  });
});
