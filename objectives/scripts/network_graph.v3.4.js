// network_graph.v3.4.js
// network_graph.v3.1.js
// v2: adds similarity-metric selector to edge settings.

// ── Edge Selection State ──────────────────────────────────────────────────────

const edgeProperties = {
    mode:             'knn',     // 'knn' | 'intersection' | 'threshold'
    k:                5,         // neighbours per node (knn / intersection modes)
    threshold:        0.20,      // weight floor (threshold mode)
    similarityMetric: 'overlap', // which metric drives edge weights
};

// ── Graph Builder ─────────────────────────────────────────────────────────────

function buildObjectiveGraph() {
    const objs = getActiveObjectives();

    const prevPositions = {};
    if (stateProperties.lastDataset) {
        stateProperties.lastDataset.nodes.forEach(n => {
            prevPositions[n.id] = { x: n.x, y: n.y, fx: n.fx, fy: n.fy, cluster: n.cluster };
        });
    }

    const nodes = objs.map(obj => {
        const prev = prevPositions[obj.id] || {};
        return { id: obj.id, cluster: prev.cluster, x: prev.x, y: prev.y };
    });

    // Full pairwise similarities — pass selected metric
    const allEdges = computeAllSimilarities(objs, edgeProperties.similarityMetric);
    stateProperties.rawLinks = allEdges;

    const links = buildKNNEdges(
        allEdges,
        edgeProperties.k,
        edgeProperties.mode,
        edgeProperties.threshold
    );

    return { nodes, links };
}

function rebuildAndDraw() {
    if (!objectives.length) return;
    const dataset = buildObjectiveGraph();
    const isFirstDraw = stateProperties.lastDataset === null;
    stateProperties.lastDataset = dataset;
    if (isFirstDraw) {
        startSimulation();
    } else {
        updateSimulation();
        updateForces();
        updateDisplay(stateProperties.transition);
    }
}

// ── Edge Controls UI ──────────────────────────────────────────────────────────

const METRIC_DEFS = {
    jaccard: {
        label: 'Jaccard',
        help:  '|shared| divided by |total unique|. The standard balanced metric — penalises both extra tags and missing tags equally. Best general-purpose starting point.'
    },
    dice: {
        label: 'Dice (Sorensen)',
        help:  '2 x |shared| divided by (|A| + |B|). Weights the shared portion more heavily than Jaccard. Two objectives each sharing half their tags score higher than Jaccard gives.'
    },
    cosine: {
        label: 'Cosine',
        help:  '|shared| divided by sqrt(|A| x |B|). Treats tag sets as binary vectors and measures the angle between them. Less sensitive to big differences in total tag count between objectives.'
    },
    overlap: {
        label: 'Overlap',
        help:  '|shared| divided by min(|A|, |B|). Fraction of the SMALLER tag set that is covered. A focused 3-tag objective sharing all its tags with a broad 20-tag one scores 1.0. Good for connecting specialised objectives to broader ones.'
    },
    resourceAllocation: {
        label: 'Resource Allocation',
        help:  'Sum of 1/degree(tag) for shared tags (normalised to 0-1). Rare shared tags count far more than ubiquitous ones. Two objectives sharing "deterrence_theory" score much higher than two sharing "logical_structure_analysis". Surfaces niche connections.'
    },
    adamicAdar: {
        label: 'Adamic-Adar',
        help:  'Sum of 1/log(degree(tag)+1) for shared tags (normalised to 0-1). Like Resource Allocation but with a softer logarithmic penalty so extremely rare tags do not completely dominate the score. A good balance between frequency-awareness and stability.'
    },
};

function renderEdgeUI() {
    const container = document.getElementById('edge-mode-ui');
    if (!container) return;
    const m = edgeProperties.similarityMetric || 'jaccard';
    const metricOptions = Object.entries(METRIC_DEFS)
        .map(([val, def]) => `<option value="${val}"${m === val ? ' selected' : ''}>${def.label}</option>`)
        .join('');

    container.innerHTML = `
        <label>
            <span class="param-label-tip"
                title="How tag overlap is converted into a numeric edge weight. Higher score = stronger, more opaque edge and stronger link-spring force.">
                similarity metric
            </span>
            <select onchange="onMetricChange(this.value)">${metricOptions}</select>
        </label>
        <div id="metric-help-text"
             style="font-size:0.82em;color:#555;line-height:1.4;margin:3px 0 6px;padding:4px 6px;background:#f5f5f5;border-left:3px solid #aaa;border-radius:2px;">
            ${METRIC_DEFS[m] ? METRIC_DEFS[m].help : ''}
        </div>
        <label>
            <span class="param-label-tip"
                title="kNN union: edge if either node ranks the other in top-k. kNN mutual: only if both mutually rank each other. Threshold: all edges at or above the cutoff.">
                edge mode
            </span>
            <select id="edge-mode-select" onchange="onEdgeModeChange(this.value)">
                <option value="knn"          ${edgeProperties.mode === 'knn'          ? 'selected' : ''}>kNN union \u2014 top-k of either node</option>
                <option value="intersection" ${edgeProperties.mode === 'intersection' ? 'selected' : ''}>kNN mutual \u2014 top-k of both nodes</option>
                <option value="threshold"    ${edgeProperties.mode === 'threshold'    ? 'selected' : ''}>Threshold \u2014 similarity \u2265 cutoff</option>
            </select>
        </label>
        <div id="edge-param-k" style="${edgeProperties.mode === 'threshold' ? 'display:none' : ''}">
            <label>
                <span class="param-label-tip" title="How many top-similar neighbours each node connects to (kNN modes only).">
                    neighbours k
                </span>
                <output id="edge-k-val">${edgeProperties.k}</output>
                <input type="range" min="1" max="20" step="1" value="${edgeProperties.k}"
                    oninput="edgeProperties.k=parseInt(this.value);
                             document.getElementById('edge-k-val').textContent=this.value;">
            </label>
        </div>
        <div id="edge-param-thresh" style="${edgeProperties.mode !== 'threshold' ? 'display:none' : ''}">
            <label>
                <span class="param-label-tip" title="Draw all edges with similarity at or above this value.">
                    min similarity
                </span>
                <output id="edge-thresh-val">${edgeProperties.threshold.toFixed(2)}</output>
                <input type="range" min="0" max="1" step="0.01" value="${edgeProperties.threshold}"
                    oninput="edgeProperties.threshold=parseFloat(this.value);
                             document.getElementById('edge-thresh-val').textContent=parseFloat(this.value).toFixed(2);">
            </label>
        </div>
        <div style="font-size:0.82em;color:#555;margin-top:4px;line-height:1.3;">
            Edge opacity &amp; width scale with the computed similarity score.
        </div>
    `;
}

function onMetricChange(metric) {
    edgeProperties.similarityMetric = metric;
    const helpEl = document.getElementById('metric-help-text');
    if (helpEl && METRIC_DEFS[metric]) helpEl.textContent = METRIC_DEFS[metric].help;
}

function onEdgeModeChange(mode) {
    edgeProperties.mode = mode;
    const kDiv = document.getElementById('edge-param-k');
    const tDiv = document.getElementById('edge-param-thresh');
    if (kDiv) kDiv.style.display = mode === 'threshold' ? 'none' : '';
    if (tDiv) tDiv.style.display = mode === 'threshold' ? ''     : 'none';
}
