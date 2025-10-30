'use client';
export const getToken = () => {
  if (typeof window == `undefined`) return undefined;
};

export const setToken = (token: string) => {
  localStorage.setItem(`token`, token);
};

export const clearToken = () => {
  localStorage.removeItem(`token`);
};
