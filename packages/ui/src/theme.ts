export const THEME_STORAGE_KEY = `remoola-theme`;
export const THEME_COOKIE_KEY = `remoola-theme`;
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ThemePreference = `light` | `dark` | `system`;
export type ResolvedTheme = Exclude<ThemePreference, `system`>;
export type ThemeColorMap = Record<ResolvedTheme, string>;

export const DEFAULT_THEME_COLORS: ThemeColorMap = {
  light: `#f8fafc`,
  dark: `#0f172a`,
};

type StorageLike = Pick<Storage, `getItem` | `setItem`>;

interface StorageOptions {
  storageKey?: string;
  storage?: StorageLike | null;
}

interface CookieOptions {
  cookieKey?: string;
  cookieMaxAgeSeconds?: number;
}

interface PersistThemePreferenceOptions extends StorageOptions, CookieOptions {
  document?: Document | null;
}

interface ReadPersistedThemePreferenceOptions extends StorageOptions, CookieOptions {
  document?: Document | null;
  fallbackTheme?: ThemePreference;
}

interface ApplyThemeToDocumentOptions {
  document?: Document | null;
  includeBody?: boolean;
  preference?: ThemePreference;
  syncColorScheme?: boolean;
}

interface SetThemeColorMetaOptions {
  document?: Document | null;
  themeColors?: ThemeColorMap;
}

interface BuildThemeBootstrapScriptOptions extends CookieOptions {
  defaultTheme?: ThemePreference;
  storageKey?: string;
  includeBody?: boolean;
  includeThemeColor?: boolean;
  themeColors?: ThemeColorMap;
  syncColorScheme?: boolean;
}

function getBrowserStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof window === `undefined`) {
    return null;
  }

  return window.localStorage;
}

function getBrowserDocument(documentRef?: Document | null): Document | null {
  if (documentRef !== undefined) {
    return documentRef;
  }

  if (typeof document === `undefined`) {
    return null;
  }

  return document;
}

export function parseThemePreference(value: unknown): ThemePreference | null {
  if (typeof value !== `string`) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === `light` || normalized === `dark` || normalized === `system`) {
    return normalized;
  }

  return null;
}

export function normalizeThemePreference(value: unknown, fallback: ThemePreference = `system`): ThemePreference {
  return parseThemePreference(value) ?? fallback;
}

export function resolveThemePreference(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (theme === `system`) {
    return prefersDark ? `dark` : `light`;
  }

  return theme;
}

export function getSystemResolvedTheme(win?: Window | null): ResolvedTheme {
  if (!win) {
    if (typeof window === `undefined`) {
      return `light`;
    }
    win = window;
  }

  if (typeof win.matchMedia !== `function`) {
    return `light`;
  }

  return win.matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`;
}

export function readThemePreferenceFromStorage({
  storageKey = THEME_STORAGE_KEY,
  storage,
}: StorageOptions = {}): ThemePreference | null {
  const storageRef = getBrowserStorage(storage);
  if (!storageRef) {
    return null;
  }

  try {
    return parseThemePreference(storageRef.getItem(storageKey));
  } catch {
    return null;
  }
}

export function readPersistedThemePreference({
  storageKey = THEME_STORAGE_KEY,
  storage,
  cookieKey = THEME_COOKIE_KEY,
  document: documentRef,
  fallbackTheme,
}: ReadPersistedThemePreferenceOptions = {}): ThemePreference | null {
  const browserDocument = getBrowserDocument(documentRef);
  const documentTheme = parseThemePreference(browserDocument?.documentElement.dataset.themePreference);
  if (documentTheme) {
    return documentTheme;
  }

  const cookieTheme = readThemeCookie(browserDocument?.cookie, { cookieKey });
  if (cookieTheme) {
    return cookieTheme;
  }

  return readThemePreferenceFromStorage({ storageKey, storage }) ?? fallbackTheme ?? null;
}

export function writeThemePreferenceToStorage(theme: ThemePreference, { storageKey = THEME_STORAGE_KEY, storage }: StorageOptions = {}): void {
  const storageRef = getBrowserStorage(storage);
  if (!storageRef) {
    return;
  }

  try {
    storageRef.setItem(storageKey, theme);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function buildThemeCookieValue(
  theme: ThemePreference,
  {
    cookieKey = THEME_COOKIE_KEY,
    cookieMaxAgeSeconds = THEME_COOKIE_MAX_AGE_SECONDS,
  }: CookieOptions = {},
): string {
  return `${cookieKey}=${theme}; Path=/; Max-Age=${cookieMaxAgeSeconds}; SameSite=Lax`;
}

export function readThemeCookie(cookieHeader: string | null | undefined, { cookieKey = THEME_COOKIE_KEY }: CookieOptions = {}): ThemePreference | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(`;`);
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split(`=`);
    if (rawKey !== cookieKey) {
      continue;
    }
    return parseThemePreference(rawValue.join(`=`));
  }

  return null;
}

export function writeThemePreferenceCookie(
  theme: ThemePreference,
  {
    cookieKey = THEME_COOKIE_KEY,
    cookieMaxAgeSeconds = THEME_COOKIE_MAX_AGE_SECONDS,
    document: documentRef,
  }: PersistThemePreferenceOptions = {},
): void {
  const browserDocument = getBrowserDocument(documentRef);
  if (!browserDocument) {
    return;
  }

  browserDocument.cookie = buildThemeCookieValue(theme, { cookieKey, cookieMaxAgeSeconds });
}

export function persistThemePreference(theme: ThemePreference, options: PersistThemePreferenceOptions = {}): void {
  writeThemePreferenceToStorage(theme, options);
  writeThemePreferenceCookie(theme, options);
}

export function applyThemeToDocument(
  resolvedTheme: ResolvedTheme,
  {
    document: documentRef,
    includeBody = true,
    preference,
    syncColorScheme = true,
  }: ApplyThemeToDocumentOptions = {},
): void {
  const browserDocument = getBrowserDocument(documentRef);
  if (!browserDocument) {
    return;
  }

  const root = browserDocument.documentElement;
  const body = includeBody ? browserDocument.body : null;

  root.classList.remove(`light`, `dark`);
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  if (preference) {
    root.dataset.themePreference = preference;
  }
  if (syncColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }

  if (body) {
    body.classList.remove(`light`, `dark`);
    body.classList.add(resolvedTheme);
    body.dataset.theme = resolvedTheme;
    if (syncColorScheme) {
      body.style.colorScheme = resolvedTheme;
    }
  }
}

export function setThemeColorMeta(
  resolvedTheme: ResolvedTheme,
  {
    document: documentRef,
    themeColors = DEFAULT_THEME_COLORS,
  }: SetThemeColorMetaOptions = {},
): void {
  const browserDocument = getBrowserDocument(documentRef);
  if (!browserDocument) {
    return;
  }

  const color = themeColors[resolvedTheme];
  const metas = browserDocument.querySelectorAll(`meta[name="theme-color"]`);
  if (metas.length > 0) {
    metas.forEach((meta) => {
      meta.setAttribute(`content`, color);
    });
    return;
  }

  const meta = browserDocument.createElement(`meta`);
  meta.setAttribute(`name`, `theme-color`);
  meta.setAttribute(`content`, color);
  browserDocument.head.appendChild(meta);
}

export function buildThemeBootstrapScript({
  defaultTheme = `system`,
  storageKey = THEME_STORAGE_KEY,
  cookieKey = THEME_COOKIE_KEY,
  cookieMaxAgeSeconds = THEME_COOKIE_MAX_AGE_SECONDS,
  includeBody = true,
  includeThemeColor = false,
  themeColors = DEFAULT_THEME_COLORS,
  syncColorScheme = true,
}: BuildThemeBootstrapScriptOptions = {}): string {
  return [
    `(function(){try{`,
    `var STORAGE_KEY=${JSON.stringify(storageKey)};`,
    `var COOKIE_KEY=${JSON.stringify(cookieKey)};`,
    `var DEFAULT_THEME=${JSON.stringify(defaultTheme)};`,
    `var INCLUDE_BODY=${includeBody ? `true` : `false`};`,
    `var INCLUDE_THEME_COLOR=${includeThemeColor ? `true` : `false`};`,
    `var SYNC_COLOR_SCHEME=${syncColorScheme ? `true` : `false`};`,
    `var COOKIE_MAX_AGE=${String(cookieMaxAgeSeconds)};`,
    `var THEME_COLORS={light:${JSON.stringify(themeColors.light)},dark:${JSON.stringify(themeColors.dark)}};`,
    `function parseTheme(value){`,
    `if(!value)return null;`,
    `var normalized=String(value).trim().toLowerCase();`,
    `return normalized==='light'||normalized==='dark'||normalized==='system'?normalized:null;`,
    `}`,
    `function readCookie(name){`,
    `var prefix=name+'=';`,
    `var parts=document.cookie?document.cookie.split(';'):[];`,
    `for(var index=0;index<parts.length;index+=1){`,
    `var item=parts[index].trim();`,
    `if(item.indexOf(prefix)===0){return item.slice(prefix.length);}`,
    `}`,
    `return null;`,
    `}`,
    `function writeCookie(theme){`,
    `document.cookie=COOKIE_KEY+'='+theme+'; Path=/; Max-Age='+COOKIE_MAX_AGE+'; SameSite=Lax';`,
    `}`,
    `function getStoredTheme(){`,
    `var cookieTheme=parseTheme(readCookie(COOKIE_KEY));`,
    `if(cookieTheme)return cookieTheme;`,
    `var stored=null;`,
    `try{stored=window.localStorage.getItem(STORAGE_KEY);}catch(error){}`,
    `var storedTheme=parseTheme(stored);`,
    `return storedTheme||DEFAULT_THEME;`,
    `}`,
    `function resolveTheme(theme){`,
    `if(theme==='system'){`,
    `return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';`,
    `}`,
    `return theme==='dark'?'dark':'light';`,
    `}`,
    `function apply(resolvedTheme,theme){`,
    `var root=document.documentElement;`,
    `var body=document.body;`,
    `root.classList.remove('light','dark');`,
    `root.classList.add(resolvedTheme);`,
    `root.dataset.theme=resolvedTheme;`,
    `root.dataset.themePreference=theme;`,
    `if(SYNC_COLOR_SCHEME){root.style.colorScheme=resolvedTheme;}`,
    `if(INCLUDE_BODY&&body){`,
    `body.classList.remove('light','dark');`,
    `body.classList.add(resolvedTheme);`,
    `body.dataset.theme=resolvedTheme;`,
    `if(SYNC_COLOR_SCHEME){body.style.colorScheme=resolvedTheme;}`,
    `}`,
    `if(INCLUDE_THEME_COLOR){`,
    `var color=THEME_COLORS[resolvedTheme]||THEME_COLORS.light;`,
    `var metas=document.querySelectorAll('meta[name="theme-color"]');`,
    `if(metas.length){`,
    `for(var i=0;i<metas.length;i+=1){metas[i].setAttribute('content',color);}`,
    `}else{`,
    `var meta=document.createElement('meta');`,
    `meta.name='theme-color';`,
    `meta.setAttribute('content',color);`,
    `document.head.appendChild(meta);`,
    `}`,
    `}`,
    `}`,
    `var theme=getStoredTheme();`,
    `var resolvedTheme=resolveTheme(theme);`,
    `try{window.localStorage.setItem(STORAGE_KEY,theme);}catch(error){}`,
    `writeCookie(theme);`,
    `apply(resolvedTheme,theme);`,
    `}catch(error){}})();`,
  ].join(``);
}
