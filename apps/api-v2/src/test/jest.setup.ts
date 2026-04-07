process.env.COOKIE_SECURE = `false`;

import { Logger } from '@nestjs/common';

// Keep API test output readable; production runtime logger is unaffected.
Logger.overrideLogger(false);
