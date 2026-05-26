// similarity.v2.2.js
// Tag-based similarity between objectives.
// Supports six metrics: Jaccard, Dice, Cosine, Overlap,
// Resource Allocation, and Adamic-Adar.

// Tag-degree map rebuilt by computeAllSimilarities() on every graph rebuild.
// Used by Resource Allocation and Adamic-Adar to weight rare shared tags.
let _tagDegree = {};

function _buildTagDegree(objs) {
    _tagDegree = {};
    objs.forEach(obj => {
        obj.tags.forEach(t => { _tagDegree[t] = (_tagDegree[t] || 0) + 1; });
    });
}

// ── Metric implementations ────────────────────────────────────────────────────

/** Jaccard: |A intersect B| / |A union B|  — balanced; default metric. */
function jaccard(tags1, tags2) {
    if (!tags1.length && !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let inter = 0;
    for (const t of s1) { if (s2.has(t)) inter++; }
    const union = s1.size + s2.size - inter;
    return union > 0 ? inter / union : 0;
}

/** Dice / Sorensen: 2|A intersect B| / (|A|+|B|)
 *  Weights the intersection more heavily than Jaccard.
 *  Objects sharing half their tags each score higher than under Jaccard. */
function dice(tags1, tags2) {
    if (!tags1.length && !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let inter = 0;
    for (const t of s1) { if (s2.has(t)) inter++; }
    const denom = s1.size + s2.size;
    return denom > 0 ? (2 * inter) / denom : 0;
}

/** Cosine: |A intersect B| / sqrt(|A| x |B|)
 *  Treats tag presence as a binary vector; measures the angle between them.
 *  Less sensitive to differences in total tag count than Jaccard. */
function cosine(tags1, tags2) {
    if (!tags1.length || !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let inter = 0;
    for (const t of s1) { if (s2.has(t)) inter++; }
    return inter / Math.sqrt(s1.size * s2.size);
}

/** Overlap: |A intersect B| / min(|A|, |B|)
 *  Fraction of the SMALLER set covered by the larger.
 *  A focused 3-tag objective sharing all its tags with a broad 20-tag one scores 1.0. */
function overlap(tags1, tags2) {
    if (!tags1.length || !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let inter = 0;
    for (const t of s1) { if (s2.has(t)) inter++; }
    const minSize = Math.min(s1.size, s2.size);
    return minSize > 0 ? inter / minSize : 0;
}

/** Resource Allocation: sum of 1/degree(t) for t in A intersect B  (normalised 0-1)
 *  Rare shared tags count far more than common ones.
 *  Two objectives both tagged "deterrence_theory" score much higher than
 *  two sharing "logical_structure_analysis" (present on hundreds of objectives). */
function resourceAllocation(tags1, tags2) {
    if (!tags1.length || !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let ra = 0;
    for (const t of s1) {
        if (s2.has(t)) ra += 1 / (_tagDegree[t] || 1);
    }
    // Normalise by the max possible RA (if the smaller set were fully shared)
    const minSet = s1.size <= s2.size ? s1 : s2;
    let maxRA = 0;
    for (const t of minSet) maxRA += 1 / (_tagDegree[t] || 1);
    return maxRA > 0 ? ra / maxRA : 0;
}

/** Adamic-Adar: sum of 1/log(degree(t)+1) for t in A intersect B  (normalised 0-1)
 *  Like Resource Allocation but with a softer logarithmic penalty so
 *  extremely rare tags do not completely dominate the score. */
function adamicAdar(tags1, tags2) {
    if (!tags1.length || !tags2.length) return 0;
    const s1 = new Set(tags1), s2 = new Set(tags2);
    let aa = 0;
    for (const t of s1) {
        if (s2.has(t)) aa += 1 / Math.log(_tagDegree[t] + 1 || 1);
    }
    const minSet = s1.size <= s2.size ? s1 : s2;
    let maxAA = 0;
    for (const t of minSet) maxAA += 1 / Math.log(_tagDegree[t] + 1 || 1);
    return maxAA > 0 ? aa / maxAA : 0;
}

// Alias kept for any remaining callers
const weightedJaccard = jaccard;

// ── Dispatcher ────────────────────────────────────────────────────────────────

function computeSimilarity(tags1, tags2, metric) {
    switch (metric) {
        case 'dice':               return dice(tags1, tags2);
        case 'cosine':             return cosine(tags1, tags2);
        case 'overlap':            return overlap(tags1, tags2);
        case 'resourceAllocation': return resourceAllocation(tags1, tags2);
        case 'adamicAdar':         return adamicAdar(tags1, tags2);
        case 'jaccard':
        default:                   return jaccard(tags1, tags2);
    }
}

/** Compute all pairwise similarities for the active objectives.
 *  metric defaults to 'jaccard'. */
function computeAllSimilarities(objs, metric) {
    metric = metric || 'jaccard';
    _buildTagDegree(objs);
    const edges = [];
    for (let i = 0; i < objs.length; i++) {
        for (let j = i + 1; j < objs.length; j++) {
            const score = computeSimilarity(objs[i].tags, objs[j].tags, metric);
            if (score > 0) {
                edges.push({ source: objs[i].id, target: objs[j].id, weight: score });
            }
        }
    }
    return edges;
}

/** Build k-nearest-neighbor edges from pairwise similarities. */
function buildKNNEdges(allEdges, k, mode, threshold) {
    mode      = mode      || 'knn';
    threshold = threshold || 0.1;

    if (mode === 'threshold') {
        return allEdges.filter(function(e) { return e.weight >= threshold; });
    }

    const topK = {}, byNode = {};
    allEdges.forEach(function(e) {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        if (!byNode[s]) byNode[s] = [];
        if (!byNode[t]) byNode[t] = [];
        byNode[s].push({ neighbor: t, weight: e.weight });
        byNode[t].push({ neighbor: s, weight: e.weight });
    });

    Object.keys(byNode).forEach(function(nodeId) {
        byNode[nodeId].sort(function(a, b) { return b.weight - a.weight; });
        topK[nodeId] = new Set(byNode[nodeId].slice(0, k).map(function(n) { return n.neighbor; }));
    });

    return allEdges.filter(function(e) {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        const sHasT = topK[s] && topK[s].has(t);
        const tHasS = topK[t] && topK[t].has(s);
        return mode === 'intersection' ? (sHasT && tHasS) : (sHasT || tHasS);
    });
}
