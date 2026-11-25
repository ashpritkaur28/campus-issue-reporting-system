import { ISSUE_CATEGORIES, IssueCategory, TRAINING_DATASET } from './trainingData.ts';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into',
  'and', 'or', 'but', 'if', 'then', 'so', 'not', 'no', 'nor', 'too', 'very',
  'can', 'cannot', 'could', 'would', 'should', 'will', 'shall', 'may', 'might',
  'this', 'that', 'these', 'those', 'it', 'its', 'my', 'our', 'your', 'their',
  'we', 'i', 'you', 'they', 'he', 'she', 'has', 'have', 'had', 'do', 'does', 'did',
  'near', 'inside', 'outside', 'around', 'also', 'even', 'just', 'here', 'there',
  'please', 'kindly', 'urgent', 'issue', 'problem', 'complaint', 'campus', 'college',
]);

const NORMALIZATION_MAP: Record<string, string> = {
  wifi: 'wifi',
  'wi-fi': 'wifi',
  wireless: 'wifi',
  internet: 'internet',
  net: 'internet',
  network: 'network',
  lan: 'lan',
  ethernet: 'ethernet',
  router: 'router',
  disconnected: 'disconnect',
  disconnecting: 'disconnect',
  disconnects: 'disconnect',
  flickering: 'flicker',
  leaking: 'leak',
  leakage: 'leak',
  leaks: 'leak',
  broken: 'break',
  cracked: 'crack',
  damaged: 'damage',
  clogged: 'clog',
  blocked: 'block',
  overflowing: 'overflow',
  smells: 'smell',
  smelling: 'smell',
  working: 'work',
  lights: 'light',
  lighting: 'light',
  washrooms: 'washroom',
  restrooms: 'restroom',
  toilets: 'toilet',
  computers: 'computer',
  pcs: 'pc',
  fans: 'fan',
  benches: 'bench',
  chairs: 'chair',
  tables: 'table',
  doors: 'door',
  windows: 'window',
  books: 'book',
  cameras: 'camera',
  cctvs: 'cctv',
  ac: 'ac',
  'air-conditioner': 'ac',
  conditioner: 'ac',
  geysers: 'geyser',
  taps: 'tap',
  coolers: 'cooler',
  dustbins: 'dustbin',
  trash: 'garbage',
  rubbish: 'garbage',
};

function normalizeToken(token: string): string {
  if (NORMALIZATION_MAP[token]) {
    return NORMALIZATION_MAP[token];
  }
  if (token.length > 4 && token.endsWith('ing')) {
    return token.slice(0, -3);
  }
  if (token.length > 4 && token.endsWith('ed')) {
    return token.slice(0, -2);
  }
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

export function preprocessText(rawText: string): string[] {
  const cleaned = rawText
    .toLowerCase()
    .replace(/wi-fi/g, 'wifi')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  if (!cleaned) {
    return [];
  }

  const rawTokens = cleaned.split(/\s+/);
  const unigrams: string[] = [];

  for (const token of rawTokens) {
    if (token.length < 2 || STOP_WORDS.has(token)) {
      continue;
    }
    const normalized = normalizeToken(token);
    if (normalized.length >= 2 && !STOP_WORDS.has(normalized)) {
      unigrams.push(normalized);
    }
  }

  // Include adjacent bigrams to capture phrases like "computer lab", "water cooler", "power socket"
  const features = [...unigrams];
  for (let i = 0; i < unigrams.length - 1; i++) {
    features.push(`${unigrams[i]}_${unigrams[i + 1]}`);
  }

  return features;
}

export interface CategoryPrediction {
  suggestedCategory: IssueCategory;
  confidence: number;
  preprocessedTokens: string[];
  matchedKeywords: string[];
  topScores: Array<{ category: IssueCategory; probability: number }>;
}

class CampusNaiveBayesClassifier {
  private categoryDocCounts = new Map<IssueCategory, number>();
  private categoryTokenCounts = new Map<IssueCategory, Map<string, number>>();
  private categoryTotalTokens = new Map<IssueCategory, number>();
  private vocabulary = new Set<string>();
  private totalDocs = 0;

  constructor() {
    this.train();
  }

  private train(): void {
    for (const cat of ISSUE_CATEGORIES) {
      this.categoryDocCounts.set(cat, 0);
      this.categoryTokenCounts.set(cat, new Map());
      this.categoryTotalTokens.set(cat, 0);
    }

    for (const sample of TRAINING_DATASET) {
      this.totalDocs += 1;
      this.categoryDocCounts.set(
        sample.category,
        (this.categoryDocCounts.get(sample.category) ?? 0) + 1
      );

      const tokens = preprocessText(sample.text);
      const tokenMap = this.categoryTokenCounts.get(sample.category)!;

      for (const token of tokens) {
        this.vocabulary.add(token);
        const weight = token.includes('_') ? 1.5 : 1;
        tokenMap.set(token, (tokenMap.get(token) ?? 0) + weight);
        this.categoryTotalTokens.set(
          sample.category,
          (this.categoryTotalTokens.get(sample.category) ?? 0) + weight
        );
      }
    }
  }

  public predict(description: string): CategoryPrediction {
    const features = preprocessText(description);
    const unigrams = features.filter((f) => !f.includes('_'));

    if (features.length === 0) {
      return {
        suggestedCategory: 'Infrastructure & Furniture',
        confidence: 0,
        preprocessedTokens: [],
        matchedKeywords: [],
        topScores: ISSUE_CATEGORIES.map((category) => ({
          category,
          probability: Math.round((100 / ISSUE_CATEGORIES.length) * 10) / 10,
        })),
      };
    }

    const vocabSize = this.vocabulary.size;
    const alpha = 0.75; // Laplace smoothing
    const logScores: Array<{ category: IssueCategory; logProb: number }> = [];

    for (const category of ISSUE_CATEGORIES) {
      const docCount = this.categoryDocCounts.get(category) ?? 0;
      const prior = Math.log((docCount + 1) / (this.totalDocs + ISSUE_CATEGORIES.length));
      const tokenMap = this.categoryTokenCounts.get(category)!;
      const totalTokensInCat = this.categoryTotalTokens.get(category) ?? 0;
      const denominator = totalTokensInCat + alpha * vocabSize;

      let logLikelihood = 0;
      for (const token of features) {
        const count = tokenMap.get(token) ?? 0;
        logLikelihood += Math.log((count + alpha) / denominator);
      }

      logScores.push({
        category,
        logProb: prior + logLikelihood,
      });
    }

    // Softmax normalization from log-probabilities
    const maxLog = Math.max(...logScores.map((s) => s.logProb));
    const expScores = logScores.map((s) => ({
      category: s.category,
      exp: Math.exp(s.logProb - maxLog),
    }));
    const sumExp = expScores.reduce((acc, s) => acc + s.exp, 0);

    const normalized = expScores
      .map((s) => ({
        category: s.category,
        probability: Math.round(((s.exp / sumExp) * 100) * 10) / 10,
      }))
      .sort((a, b) => b.probability - a.probability);

    const bestCategory = normalized[0].category;
    const bestTokenMap = this.categoryTokenCounts.get(bestCategory)!;
    const matchedKeywords = Array.from(
      new Set(unigrams.filter((token) => (bestTokenMap.get(token) ?? 0) > 0))
    ).slice(0, 6);

    return {
      suggestedCategory: bestCategory,
      confidence: normalized[0].probability,
      preprocessedTokens: Array.from(new Set(unigrams)),
      matchedKeywords,
      topScores: normalized.slice(0, 4),
    };
  }
}

export const mlClassifier = new CampusNaiveBayesClassifier();
