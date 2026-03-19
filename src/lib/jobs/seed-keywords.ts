import { prisma } from '@/lib/prisma';

const DEFAULT_KEYWORDS = [
  {
    term: '粒界',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: ['grain boundary', 'grain boundaries'],
  },
  {
    term: '格子欠陥',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: ['lattice defect', 'point defect', 'crystal defect'],
  },
  {
    term: '機械学習ポテンシャル',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: [
      'machine learning potential',
      'neural network potential',
      'MLP',
      'MLIP',
    ],
  },
  {
    term: '分子シミュレーション',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: [
      'molecular simulation',
      'molecular dynamics',
      'MD simulation',
    ],
  },
  {
    term: 'DFT計算',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: [
      'DFT',
      'density functional theory',
      'density-functional theory',
    ],
  },
  {
    term: '第一原理計算',
    type: 'CORE' as const,
    weight: 1.0,
    synonyms: [
      'first-principles calculation',
      'ab initio calculation',
      'ab initio',
    ],
  },
  {
    term: 'CCS分子シミュレーション',
    type: 'SUBFIELD' as const,
    weight: 0.8,
    synonyms: [
      'CCS',
      'carbon capture storage',
      'CO2 capture',
      'carbon sequestration',
    ],
  },
  {
    term: '光塑性効果',
    type: 'SUBFIELD' as const,
    weight: 0.8,
    synonyms: [
      'photoplastic effect',
      'photoplasticity',
      'light-induced plasticity',
    ],
  },
];

export async function seedKeywordsForUser(userId: string): Promise<void> {
  for (const kw of DEFAULT_KEYWORDS) {
    await prisma.userKeyword.upsert({
      where: { userId_term: { userId, term: kw.term } },
      create: { userId, ...kw },
      update: {},
    });
  }

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  console.log(
    `[Seed] Seeded ${DEFAULT_KEYWORDS.length} keywords for user ${userId}`
  );
}
