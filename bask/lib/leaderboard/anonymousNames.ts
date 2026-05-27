'use client';

import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

/**
 * Random adjective-animal names (e.g. "gentle-dolphin").
 * Global uniqueness is enforced by Supabase — see unique-anonymous-name.sql.
 */
export function generateAnonymousName(exclude?: string): string {
  const normalizedExclude = exclude?.trim().toLowerCase();

  for (let attempt = 0; attempt < 20; attempt++) {
    const name = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: '-',
      length: 2,
      style: 'lowerCase',
    });
    if (name !== normalizedExclude) return name;
  }

  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2,
    style: 'lowerCase',
    seed: `${Date.now()}-${Math.random()}`,
  });
}
