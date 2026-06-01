import { join } from 'path';

import { buildApiV2DebtReport, formatApiV2DebtReport } from '../src/architecture/api-v2-debt-report';

const appRoot = join(__dirname, `..`);
const report = buildApiV2DebtReport(appRoot);

process.stdout.write(`${formatApiV2DebtReport(report)}\n`);
