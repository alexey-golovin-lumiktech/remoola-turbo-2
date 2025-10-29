import {
  EMPTY_STRING,
  BAD_CHARS,
  MULTI_SPACES_RE,
  ONE_SPACE,
  NON_ALPHABETIC_CHARACTERS_KEEPING_SPACES_RE,
} from '../constants';

export const sanitizeString = (str: string) => {
  const copy = (str || EMPTY_STRING).slice(0);
  return copy.replace(BAD_CHARS, EMPTY_STRING).trim();
};

export const normalizeString = (str: string) => {
  return (str || EMPTY_STRING).replace(MULTI_SPACES_RE, ONE_SPACE).trim();
};

export const normalizeAndSanitizeString = (str: string) => {
  return sanitizeString(normalizeString(str || EMPTY_STRING));
};

export const normalizeAndSanitizeArray = (arr: string[]) => {
  return arr.map(normalizeAndSanitizeString);
};

export const normalizeAndSplitString = (input: string) => {
  return normalizeAndSanitizeString(input || EMPTY_STRING)
    .replace(NON_ALPHABETIC_CHARACTERS_KEEPING_SPACES_RE, EMPTY_STRING)
    .split(MULTI_SPACES_RE)
    .filter(Boolean);
};
