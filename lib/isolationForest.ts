// Isolation Forest + Permutation SHAP + Actionable Recourse
// + Mechanistic Pattern Matching + Granger Causality
// Liu et al. (2008) "Isolation Forest"

// ── Types ────────────────────────────────────────────────────────────────────

export interface AlignedPoint { date: string; values: number[] }

export interface RecourseItem {
  featureName: string;
  currentValue: number;
  targetValue: number;
  delta: number;
  deltaPercent: number;
}

export interface SimilarPattern {
  date: string;
  similarity: number; // 0~1 cosine similarity
}

export interface AnomalyResult {
  dateIdx: number;
  date: string;
  score: number;
  shap: number[];             // per-indicator permutation SHAP
  recourse: RecourseItem[];   // actionable recourse (sorted by |deltaPercent|)
  similarPatterns: SimilarPattern[]; // mechanistic: top-3 most similar past anomalies
}

export interface CausalEdge {
  from: string;
  to: string;
  strength: number; // normalised F-stat → [0, 1]
  fStat: number;
}

export interface LatestScore {
  date: string;
  score: number;
  isAnomaly: boolean;
  rank: number;      // 전체 포인트 중 이상 점수 순위 (1 = 가장 이상)
  totalPoints: number;
}

export interface AnomalyReport {
  scores: number[];
  dates: string[];
  anomalies: AnomalyResult[];
  featureLabels: string[];
  causalEdges: CausalEdge[];
  resampledTo: "daily" | "monthly";
  cvCoverage: number;
  latestScore: LatestScore;
}

// ── Isolation Forest core ────────────────────────────────────────────────────

interface ILeaf { isLeaf: true; size: number }
interface INode { isLeaf: false; featureIdx: number; splitValue: number; left: ITree; right: ITree }
type ITree = ILeaf | INode;

// Average path length in unsuccessful BST (normalisation constant)
function c(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

function buildTree(data: number[][], maxDepth: number, depth = 0): ITree {
  if (depth >= maxDepth || data.length <= 1) return { isLeaf: true, size: data.length };
  const fi = Math.floor(Math.random() * data[0].length);
  const vals = data.map(d => d[fi]);
  const min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) return { isLeaf: true, size: data.length };
  const sv = min + Math.random() * (max - min);
  return {
    isLeaf: false, featureIdx: fi, splitValue: sv,
    left:  buildTree(data.filter(d => d[fi] <  sv), maxDepth, depth + 1),
    right: buildTree(data.filter(d => d[fi] >= sv), maxDepth, depth + 1),
  };
}

function pathLength(tree: ITree, pt: number[], depth = 0): number {
  if (tree.isLeaf) return depth + c(tree.size);
  return pt[tree.featureIdx] < tree.splitValue
    ? pathLength(tree.left,  pt, depth + 1)
    : pathLength(tree.right, pt, depth + 1);
}

function makeScorer(trees: ITree[], sub: number) {
  return (pt: number[]) =>
    Math.pow(2, -(trees.reduce((s, t) => s + pathLength(t, pt), 0) / trees.length) / c(sub));
}

// ── Walk-Forward Cross-Validation ─────────────────────────────────────────────
// 각 포인트를 해당 포인트 이전 데이터만으로 학습한 모델로 채점 (lookahead bias 제거)
// 처음 minTrainRatio 구간은 full model 점수로 대체 (훈련 데이터 부족)
function walkForwardCVScores(
  normalized: number[][],
  fullScores: number[],       // fallback: full model 점수
  nEstimators: number,
  sub: number,
  nFolds: number
): { scores: number[]; cvCoverage: number } {
  const n = normalized.length;
  const cvScores = fullScores.slice(); // 기본값: full model 점수
  const minTrain  = Math.max(30, Math.floor(n * 0.4));
  const remaining = n - minTrain;

  if (remaining <= 0) return { scores: cvScores, cvCoverage: 0 };

  const foldSize = Math.ceil(remaining / nFolds);
  let cvCount = 0;

  for (let fold = 0; fold < nFolds; fold++) {
    const testStart = minTrain + fold * foldSize;
    const testEnd   = Math.min(testStart + foldSize, n);
    if (testStart >= n) break;

    // 이 fold의 테스트 구간 이전 데이터만으로 학습
    const trainData  = normalized.slice(0, testStart);
    const actualSub  = Math.min(sub, trainData.length);
    const maxDepth   = Math.ceil(Math.log2(Math.max(actualSub, 2)));

    const foldTrees = Array.from({ length: nEstimators }, () => {
      const idx = Array.from({ length: actualSub }, () => Math.floor(Math.random() * trainData.length));
      return buildTree(idx.map(i => trainData[i]), maxDepth);
    });
    const foldScorer = makeScorer(foldTrees, actualSub);

    for (let i = testStart; i < testEnd; i++) {
      cvScores[i] = foldScorer(normalized[i]);
      cvCount++;
    }
  }

  return { scores: cvScores, cvCoverage: cvCount / n };
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

function computeStats(matrix: number[][]): { means: number[]; stds: number[] } {
  const nF = matrix[0].length;
  const means = Array.from({ length: nF }, (_, f) =>
    matrix.reduce((s, r) => s + r[f], 0) / matrix.length
  );
  const stds = Array.from({ length: nF }, (_, f) => {
    const m = means[f];
    const v = matrix.reduce((s, r) => s + (r[f] - m) ** 2, 0) / matrix.length;
    return Math.sqrt(v) || 1;
  });
  return { means, stds };
}

function normalise(matrix: number[][], means: number[], stds: number[]): number[][] {
  return matrix.map(row => row.map((v, f) => (v - means[f]) / stds[f]));
}

// ── Permutation SHAP ─────────────────────────────────────────────────────────
// Per anomaly: measures each indicator's contribution to the anomaly score.
// Positive SHAP = indicator pushed score up (more anomalous).

function computeShap(
  score: (pt: number[]) => number,
  normalized: number[][],
  pointIdx: number,
  nIndicators: number,
  nPerm: number
): number[] {
  const pt = normalized[pointIdx];
  const base = score(pt);
  const n = normalized.length;
  const nFeatures = pt.length; // nIndicators * 2 (values + change rates)

  const rawShap = Array.from({ length: nFeatures }, (_, f) => {
    let diff = 0;
    for (let p = 0; p < nPerm; p++) {
      const modified = [...pt];
      modified[f] = normalized[Math.floor(Math.random() * n)][f];
      diff += base - score(modified);
    }
    return diff / nPerm;
  });

  // Collapse value-feature + change-rate-feature into one value per indicator
  return Array.from({ length: nIndicators }, (_, j) => rawShap[j] + rawShap[nIndicators + j]);
}

// ── Actionable Recourse ───────────────────────────────────────────────────────
// For each indicator: find minimum change (in original scale) that normalises the anomaly.
// Only value features (0..N-1) are tested — change rates are derived, not directly actionable.

function computeRecourse(
  score: (pt: number[]) => number,
  normalized: number[][],
  pointIdx: number,
  originalValues: number[],
  indicatorNames: string[],
  means: number[],
  stds: number[],
  threshold: number
): RecourseItem[] {
  const pt = [...normalized[pointIdx]];
  const n = indicatorNames.length;
  const results: RecourseItem[] = [];

  for (let j = 0; j < n; j++) {
    let bestDeltaNorm = Infinity;
    let bestSign = 0;

    for (const dir of [-1, 1]) {
      const probe = [...pt];
      probe[j] = pt[j] + dir * 8; // check if max range is sufficient
      if (score(probe) > threshold) continue; // can't normalise in this direction

      let lo = 0, hi = 8;
      for (let iter = 0; iter < 35; iter++) {
        const mid = (lo + hi) / 2;
        const test = [...pt];
        test[j] = pt[j] + dir * mid;
        if (score(test) <= threshold) hi = mid;
        else lo = mid;
      }
      if (hi < Math.abs(bestDeltaNorm)) {
        bestDeltaNorm = dir * hi;
        bestSign = dir;
      }
    }

    if (bestSign === 0) continue; // infeasible — skip

    const deltaOriginal = bestDeltaNorm * stds[j];
    const current = originalValues[j];
    const target = current + deltaOriginal;
    const deltaPercent = current !== 0 ? (deltaOriginal / Math.abs(current)) * 100 : 0;

    results.push({
      featureName: indicatorNames[j],
      currentValue: current,
      targetValue: target,
      delta: deltaOriginal,
      deltaPercent,
    });
  }

  return results.sort((a, b) => Math.abs(a.deltaPercent) - Math.abs(b.deltaPercent));
}

// ── Mechanistic Pattern Matching ──────────────────────────────────────────────
// Compare SHAP vectors between anomalies using cosine similarity.
// "현재 이상 패턴은 과거 어느 시점과 가장 닮았는가"

function cosine(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA > 0 && magB > 0 ? dot / (magA * magB) : 0;
}

function findSimilarPatterns(
  targetShap: number[],
  targetDate: string,
  anomalies: { date: string; shap: number[] }[],
  topK = 3
): SimilarPattern[] {
  return anomalies
    .filter(a => a.date !== targetDate)
    .map(a => ({ date: a.date, similarity: cosine(targetShap, a.shap) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ── Granger Causality ─────────────────────────────────────────────────────────
// Tests if past values of X help predict Y beyond Y's own history.
// Uses first differences (% changes) for stationarity.
// Ridge OLS to avoid singular matrices.

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) return null;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) aug[row][k] -= f * aug[col][k];
    }
  }
  return aug.map((row, i) => row[n] / aug[i][i]);
}

function ridgeOLS(X: number[][], y: number[], lambda = 1e-3): number[] | null {
  const p = X[0].length;
  const n = X.length;
  const XtX = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) =>
      X.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? lambda * n : 0)
    )
  );
  const Xty = Array.from({ length: p }, (_, i) =>
    X.reduce((s, row, k) => s + row[i] * y[k], 0)
  );
  return solveLinear(XtX, Xty);
}

function rss(X: number[][], y: number[], beta: number[]): number {
  return X.reduce((s, row, k) => {
    const pred = row.reduce((acc, v, j) => acc + v * beta[j], 0);
    return s + (y[k] - pred) ** 2;
  }, 0);
}

function computeGrangerCausality(
  series: { name: string; values: number[] }[],
  lag = 2
): CausalEdge[] {
  const n = series.length;
  const edges: CausalEdge[] = [];

  // Convert to % changes for stationarity
  const diffs = series.map(s => {
    const d: number[] = [];
    for (let i = 1; i < s.values.length; i++) {
      const prev = s.values[i - 1];
      d.push(prev !== 0 ? (s.values[i] - prev) / Math.abs(prev) : 0);
    }
    return { name: s.name, diff: d };
  });

  for (let cause = 0; cause < n; cause++) {
    for (let effect = 0; effect < n; effect++) {
      if (cause === effect) continue;

      const Y = diffs[effect].diff;
      const X = diffs[cause].diff;
      const T = Y.length;
      if (T < lag * 3 + 5) continue;

      const start = lag;
      const yT = Y.slice(start);

      // Restricted model: Y ~ lagged Y
      const Xr = yT.map((_, t) =>
        Array.from({ length: lag }, (_, l) => Y[start + t - l - 1])
      );
      // Unrestricted model: Y ~ lagged Y + lagged X
      const Xu = yT.map((_, t) => [
        ...Array.from({ length: lag }, (_, l) => Y[start + t - l - 1]),
        ...Array.from({ length: lag }, (_, l) => X[start + t - l - 1]),
      ]);

      const br = ridgeOLS(Xr, yT);
      const bu = ridgeOLS(Xu, yT);
      if (!br || !bu) continue;

      const rssR = rss(Xr, yT, br);
      const rssU = rss(Xu, yT, bu);
      const df1 = lag;
      const df2 = yT.length - 2 * lag - 1;
      if (df2 <= 0) continue;

      const F = ((rssR - rssU) / df1) / (rssU / df2);
      if (F <= 0) continue;

      // Normalise: strength ≈ 0 when F≈0, ≈0.5 when F≈4 (≈p=0.05), ≈1 when F→∞
      const strength = Math.max(0, Math.min(1, 1 - 1 / (1 + F / 4)));

      if (strength >= 0.25) {
        edges.push({ from: series[cause].name, to: series[effect].name, strength, fStat: F });
      }
    }
  }

  return edges.sort((a, b) => b.strength - a.strength);
}

// ── Main export: run all analysis in one call ─────────────────────────────────

export function runAnomalyDetection(
  alignedData: AlignedPoint[],
  indicatorNames: string[],
  options: {
    nEstimators?:    number;
    cvEstimators?:   number; // walk-forward fold당 트리 수 (기본 nEstimators/2)
    nFolds?:         number;
    subsampleSize?:  number;
    topK?:           number;
    threshold?:      number;
    nPermutations?:  number;
    grangerLag?:     number;
    alignMode?:      AlignMode;
  } = {}
): AnomalyReport {
  const {
    nEstimators   = 200,
    nFolds        = 5,
    subsampleSize = 256,
    topK          = 100,
    threshold     = 0.6,
    nPermutations = 50,
    grangerLag    = 2,
    alignMode     = "monthly",
  } = options;
  const cvEstimators = options.cvEstimators ?? Math.max(50, Math.floor(nEstimators / 2));

  const nInd = indicatorNames.length;
  const n    = alignedData.length;

  // Build feature matrix: [values…, delta%…]
  const raw: number[][] = alignedData.map((row, i) => {
    const deltas = row.values.map((v, j) => {
      if (i === 0) return 0;
      const prev = alignedData[i - 1].values[j];
      return prev !== 0 ? (v - prev) / Math.abs(prev) : 0;
    });
    return [...row.values, ...deltas];
  });

  const { means, stds } = computeStats(raw);
  const norm = normalise(raw, means, stds);

  // 전체 데이터로 학습한 full model (SHAP·Recourse·Granger에 사용)
  const sub      = Math.min(subsampleSize, n);
  const maxDepth = Math.ceil(Math.log2(sub));
  const trees: ITree[] = Array.from({ length: nEstimators }, () => {
    const idx = Array.from({ length: sub }, () => Math.floor(Math.random() * n));
    return buildTree(idx.map(i => norm[i]), maxDepth);
  });
  const score = makeScorer(trees, sub);
  const fullScores = norm.map(score);

  // Walk-Forward CV: 과거 데이터만으로 학습해 lookahead bias 제거
  // 처음 40% 구간은 훈련 데이터 부족으로 full model 점수 사용
  const { scores, cvCoverage } = walkForwardCVScores(
    norm, fullScores, cvEstimators, sub, nFolds
  );

  // Select top-K anomalies above threshold
  const topIdxs = scores
    .map((s, i) => ({ i, s }))
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .filter(x => x.s >= threshold)
    .map(x => x.i);

  // Compute SHAP for all anomaly candidates first (needed for pattern matching)
  const shapMap = new Map<number, number[]>();
  for (const idx of topIdxs) {
    shapMap.set(idx, computeShap(score, norm, idx, nInd, nPermutations));
  }

  // Build full anomaly results
  const anomalyDrafts = [...shapMap.entries()].map(([idx, shap]) => ({ idx, shap }));

  const anomalies: AnomalyResult[] = anomalyDrafts
    .sort((a, b) => scores[b.idx] - scores[a.idx])
    .map(({ idx, shap }) => ({
      dateIdx: idx,
      date:    alignedData[idx].date,
      score:   scores[idx],
      shap,
      recourse: computeRecourse(
        score, norm, idx,
        alignedData[idx].values,
        indicatorNames,
        means, stds, threshold
      ),
      similarPatterns: findSimilarPatterns(
        shap,
        alignedData[idx].date,
        anomalyDrafts.map(d => ({ date: alignedData[d.idx].date, shap: d.shap }))
      ),
    }));

  // Granger causality on the full aligned series
  const causalEdges = computeGrangerCausality(
    indicatorNames.map((name, j) => ({
      name,
      values: alignedData.map(d => d.values[j]),
    })),
    grangerLag
  );

  const latestIdx  = n - 1;
  const latestRank = scores.filter(s => s > scores[latestIdx]).length + 1;
  const latestScore: LatestScore = {
    date:        alignedData[latestIdx].date,
    score:       scores[latestIdx],
    isAnomaly:   scores[latestIdx] >= threshold,
    rank:        latestRank,
    totalPoints: n,
  };

  return {
    scores,
    dates:         alignedData.map(d => d.date),
    anomalies,
    featureLabels: indicatorNames,
    causalEdges,
    resampledTo:   alignMode,
    cvCoverage,
    latestScore,
  };
}

// ── Utility: align multiple time series ──────────────────────────────────────

// 평균 관측 간격 > 20일이면 월별
export function detectFrequency(obs: { date: string }[]): "monthly" | "daily" {
  if (obs.length < 2) return "monthly";
  const sample = obs.slice(0, Math.min(12, obs.length));
  let gap = 0;
  for (let i = 1; i < sample.length; i++)
    gap += new Date(sample[i].date).getTime() - new Date(sample[i - 1].date).getTime();
  return gap / (sample.length - 1) / 86400000 > 20 ? "monthly" : "daily";
}

// 일별 → 월별: 각 월의 평균값
function toMonthly(obs: { date: string; value: number }[]): { date: string; value: number }[] {
  const buckets = new Map<string, number[]>();
  for (const o of obs) {
    const ym = o.date.slice(0, 7);
    if (!buckets.has(ym)) buckets.set(ym, []);
    buckets.get(ym)!.push(o.value);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, vals]) => ({
      date: `${ym}-01`,
      value: vals.reduce((s, v) => s + v, 0) / vals.length,
    }));
}

// 월별 → 일별: 기준 날짜 배열에 대해 앞값으로 채움 (Forward Fill)
function forwardFill(
  monthly: { date: string; value: number }[],
  dailyDates: string[]
): { date: string; value: number }[] {
  const sorted = [...monthly].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; value: number }[] = [];
  let last: number | undefined;
  let si = 0;
  for (const date of dailyDates) {
    while (si < sorted.length && sorted[si].date <= date) { last = sorted[si].value; si++; }
    if (last !== undefined) result.push({ date, value: last });
  }
  return result;
}

function strictIntersect(
  series: { observations: { date: string; value: number }[] }[]
): AlignedPoint[] {
  const maps = series.map(s => { const m = new Map<string, number>(); s.observations.forEach(o => m.set(o.date, o.value)); return m; });
  return series[0].observations
    .map(o => o.date)
    .filter(d => maps.every(m => m.has(d)))
    .sort()
    .map(date => ({ date, values: maps.map(m => m.get(date)!) }));
}

export type AlignMode = "daily" | "monthly";

export function alignSeries(
  series: { name: string; observations: { date: string; value: number }[] }[],
  mode: AlignMode = "monthly"
): AlignedPoint[] {
  if (series.length === 0) return [];
  const freqs = series.map(s => detectFrequency(s.observations));

  if (mode === "monthly") {
    // 일별 지표 → 다운샘플링, 월별은 그대로
    return strictIntersect(series.map((s, i) => ({
      ...s,
      observations: freqs[i] === "daily" ? toMonthly(s.observations) : s.observations,
    })));
  } else {
    // 일별 모드: 일별 지표들의 교집합 날짜를 기준으로, 월별 지표는 Forward Fill
    const dailySeries = series.filter((_, i) => freqs[i] === "daily");
    if (dailySeries.length === 0) {
      // 모든 지표가 월별이면 월별 모드로 폴백
      return strictIntersect(series);
    }

    // 일별 지표끼리 공통 날짜 (영업일 교집합)
    const dailyMaps = dailySeries.map(s => new Set(s.observations.map(o => o.date)));
    const refDates = dailySeries[0].observations
      .map(o => o.date)
      .filter(d => dailyMaps.every(m => m.has(d)))
      .sort();

    // 월별 지표 → Forward Fill 후 refDates 기준으로 맞춤
    const normalized = series.map((s, i) => ({
      ...s,
      observations: freqs[i] === "monthly" ? forwardFill(s.observations, refDates) : s.observations,
    }));

    return strictIntersect(normalized);
  }
}
