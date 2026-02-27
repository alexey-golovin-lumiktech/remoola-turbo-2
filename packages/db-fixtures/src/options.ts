export type FixtureMode = `fill` | `refresh` | `cleanup`;

export type FixtureOptions = {
  mode: FixtureMode;
  perTable: number;
  confirm: boolean;
};

const DEFAULT_PER_TABLE = 20;
const MAX_PER_TABLE = 20;
const MIN_PER_TABLE = 1;

function clampPerTable(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PER_TABLE;
  if (value < MIN_PER_TABLE) return MIN_PER_TABLE;
  if (value > MAX_PER_TABLE) return MAX_PER_TABLE;
  return Math.floor(value);
}

export function parseOptions(argv: string[]): FixtureOptions {
  const modeArg = argv[2];
  const mode: FixtureMode = modeArg === `refresh` || modeArg === `cleanup` ? modeArg : `fill`;

  const perTableArg = argv.find((entry) => entry.startsWith(`--per-table=`));
  const perTable = clampPerTable(perTableArg ? Number(perTableArg.split(`=`)[1]) : DEFAULT_PER_TABLE);
  const confirm = argv.includes(`--confirm`);

  return {
    mode,
    perTable,
    confirm,
  };
}

export function isUnsafeEnvironment(nodeEnv: string | undefined): boolean {
  return (nodeEnv ?? ``).toLowerCase() === `production`;
}
