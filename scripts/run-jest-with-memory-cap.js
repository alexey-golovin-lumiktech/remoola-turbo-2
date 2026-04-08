#!/usr/bin/env node
require(require('node:path').join(__dirname, 'vercel-guard.js'));

const os = require('node:os');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const MIN_HEAP_MB = 256;
const MEMORY_RATIO = 0.25;
const RSS_POLL_INTERVAL_MS = 1000;
const FORCE_KILL_GRACE_MS = 5000;
const QUIET_MEMORY_GUARD = process.env.QUIET_MEMORY_GUARD === '1';
const FAST_JEST_MODE =
  process.env.JEST_FAST_MODE === '1' || process.env.E2E_FAST_MODE === '1' || process.argv.includes('--fast-mode');

function getHeapCapMb() {
  const totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024));
  return Math.max(MIN_HEAP_MB, Math.floor(totalMemoryMb * MEMORY_RATIO));
}

function enforceMaxOldSpace(nodeOptions, heapCapMb) {
  const cleaned = nodeOptions
    .replace(/--max-old-space-size(?:=|\s+)\d+/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned ? `${cleaned} --max-old-space-size=${heapCapMb}` : `--max-old-space-size=${heapCapMb}`;
}

function hasArg(args, argName) {
  return args.some((arg) => arg === argName || arg.startsWith(`${argName}=`));
}

function readRssMbFromProc(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    if (!match) return null;
    const rssKb = Number.parseInt(match[1], 10);
    if (Number.isNaN(rssKb)) return null;
    return Math.floor(rssKb / 1024);
  } catch {
    return null;
  }
}

const heapCapMb = getHeapCapMb();
const rssCapMb = heapCapMb;
const incomingArgs = process.argv.slice(2);
const watchMode = hasArg(incomingArgs, '--watch') || hasArg(incomingArgs, '--watchAll');
const args = watchMode
  ? incomingArgs
  : FAST_JEST_MODE
    ? incomingArgs
    : [
        ...(hasArg(incomingArgs, '--runInBand') ? [] : ['--runInBand']),
        ...(hasArg(incomingArgs, '--bail') ? [] : ['--bail=1']),
        ...incomingArgs,
      ];
const env = {
  ...process.env,
  NODE_OPTIONS: enforceMaxOldSpace(process.env.NODE_OPTIONS ?? '', heapCapMb),
};

if (!QUIET_MEMORY_GUARD) {
  console.info(
    `[memory-guard] heap_cap_mb=${heapCapMb} rss_cap_mb=${rssCapMb} node_options="${env.NODE_OPTIONS}"`,
  );
  if (!watchMode) {
    if (FAST_JEST_MODE) {
      console.info('[memory-guard] fast-mode enabled; preserving user-provided Jest parallelism/options');
    } else {
      console.info('[memory-guard] fail-fast enabled with --runInBand --bail=1');
    }
  }
}

const jestBin = require.resolve('jest/bin/jest', { paths: [process.cwd()] });

const child = spawn(process.execPath, [jestBin, ...args], {
  env,
  stdio: 'inherit',
});

let terminatedByRssGuard = false;
let forceKillTimer = null;
const rssMonitor = setInterval(() => {
  const rssMb = readRssMbFromProc(child.pid);
  if (rssMb === null) return;
  if (rssMb <= rssCapMb) return;

  terminatedByRssGuard = true;
  clearInterval(rssMonitor);
  if (!QUIET_MEMORY_GUARD) {
    console.error(
      `[memory-guard] rss_limit_exceeded pid=${child.pid} rss_mb=${rssMb} rss_cap_mb=${rssCapMb}. Terminating test run.`,
    );
  }
  child.kill('SIGTERM');
  forceKillTimer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }, FORCE_KILL_GRACE_MS);
}, RSS_POLL_INTERVAL_MS);

child.on('exit', (code, signal) => {
  clearInterval(rssMonitor);
  if (forceKillTimer) clearTimeout(forceKillTimer);
  if (terminatedByRssGuard) {
    process.exit(1);
    return;
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

