'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, HttpError } from '../../../lib/api';

type SearchResult = {
  id: string;
  type: `admin` | `client` | `contract` | `payment`;
  name: string;
  href: string;
};

export default function SearchCommand() {
  const [search, setSearch] = useState(``);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === `k`) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(`.input`)?.focus();
      }
    };
    window.addEventListener(`keydown`, handler);
    return () => window.removeEventListener(`keydown`, handler);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await api.globalSearch //
          .search<{ results: SearchResult[] }>(encodeURIComponent(search), {
            signal: controller.signal,
          });

        setResults(data?.results || []);
      } catch (error) {
        if (error instanceof HttpError) console.error(`Request failed`, error.status, error.body);
        else if (!(error instanceof DOMException)) console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(fetchData, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search]);

  const handleSelect = (href: string) => {
    router.push(href);
    setSearch(``);
  };

  return (
    <div className="relative w-full">
      <input
        className="input w-full"
        placeholder="Search admins, clients, contracts, payments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>

      {search && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-white shadow-lg">
          {loading ? (
            <div className="p-3 text-gray-500 text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm">No results</div>
          ) : (
            <ul>
              {results.map((r) => (
                <li
                  key={r.id}
                  onClick={() => handleSelect(r.href)}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                >
                  <span className="font-medium">{r.name}</span>
                  {` `}
                  <span className="text-xs text-gray-400">({r.type})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
