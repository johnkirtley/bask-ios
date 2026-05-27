'use client';

const ADJECTIVES = [
  'wandering', 'swift', 'gentle', 'golden', 'bright', 'quiet', 'wild',
  'radiant', 'drifting', 'breezy', 'warm', 'sunlit', 'mossy', 'misty',
  'roaming', 'dusty', 'glowing', 'bold', 'humble', 'vivid', 'calm',
  'crisp', 'dancing', 'fading', 'gleaming', 'hidden', 'lazy', 'lofty',
  'mellow', 'nimble', 'patient', 'rolling', 'serene', 'silent', 'steady',
  'tender', 'twilight', 'velvet', 'winding', 'amber', 'coral',
  'dewy', 'earthy', 'frosted', 'hazy', 'ivory', 'jade', 'kindled',
  'lunar', 'maple', 'noble', 'olive', 'pastel', 'rustic', 'sage',
  'tawny', 'verdant', 'woven', 'alpine', 'coastal',
];

const NOUNS = [
  'meadow', 'apple', 'river', 'cloud', 'stone', 'leaf', 'pine',
  'canyon', 'brook', 'summit', 'trail', 'grove', 'shore', 'ridge',
  'bloom', 'ember', 'fern', 'hawk', 'moss', 'nest', 'oak', 'pond',
  'rain', 'sage', 'tide', 'vine', 'wolf', 'dune', 'cliff', 'creek',
  'dawn', 'echo', 'field', 'gale', 'hill', 'inlet', 'jay', 'knoll',
  'lake', 'marsh', 'orchid', 'peak', 'quail', 'reef',
  'spark', 'thorn', 'vale', 'wren', 'birch', 'cedar',
  'delta', 'elk', 'flint', 'glen', 'heron', 'iris',
  'kelp', 'lark', 'maple', 'osprey', 'plum', 'quartz',
  'robin', 'slate', 'trout', 'violet', 'willow', 'yarrow',
  'aspen', 'basalt', 'coral', 'drift', 'finch', 'granite', 'harbor',
];

export function generateAnonymousName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}
