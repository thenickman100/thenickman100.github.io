// display_graph.v2.33.js


// ── State & Display Properties ────────────────────────────────────────────────

const stateProperties = {
    lastDataset:  null,
    rawLinks:     [],
    dragEnabled:  true,
    transition:   300
};

const displayProperties = {
    node: {
        radius:     7,
        x_offset:   10,
        y_offset:   0,
        text_size:  9,
        justify:    'start',
        showLabels: false,
        shape:      'circle'   // circle | square | hexagon | triangle
    },
    edge: {
        width:        1.0,
        opacity:      0.5      // base opacity (replaces opacityScale; edges scale around this)
    },
    legend: {
        show:         true,
        showTitle:    true,
        customTitle:  '',           // empty = use auto title
        text_size:    11,
        line_spacing: 20,
        padding:      10,
        position:     'top-right'  // top-right | top-left | bottom-right | bottom-left
    }
};

const forceProperties = {
    center:  { x: 0.5, y: 0.5 },
    collide: { enabled: true, strength: 0.8, relativeRadius: 0.9, iterations: 2 },
    charge:  { enabled: true, strength: -30, distanceMin: 1, distanceMax: 200 },
    link:    { enabled: true, strength: 1.0, distance: 0, iterations: 2 },
    forceX:  { enabled: false, strength: 0.05, x: 0.5 },
    forceY:  { enabled: false, strength: 0.05, y: 0.5 },
    alpha:   { enabled: true, decay: 0.03, restart: 0.3, targetHigh: 0.3, targetLow: 0 }
};

// ── Rotation State ────────────────────────────────────────────────────────────
let _rotationDeg = 0;

function applyRotation(deg) {
    _rotationDeg = deg;
    applyCombinedTransform();
}

function applyCombinedTransform() {
    updateDimensions();
    const cx = width / 2, cy = height / 2;
    // Fetch the current zoom/pan state directly from the SVG
    const z = d3.zoomTransform(svg.node());
    // Apply zoom (translate/scale) FIRST, then local rotation
    g.attr('transform', `${z} rotate(${_rotationDeg},${cx},${cy})`);
}

// ── SVG Setup ─────────────────────────────────────────────────────────────────

let link, node, node_dots, node_text;
const svg  = d3.select('.networkx');
const g    = svg.append('g');
let width  = 800;
let height = 600;

function updateDimensions() {
    width  = window.innerWidth;
    height = window.innerHeight;
}

let simulation = d3.forceSimulation()
    .alphaDecay(forceProperties.alpha.decay);

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = d3.select('body').append('div')
    .attr('id', 'tooltip');

function showTooltip(event, d) {
    const obj = objectives.find(o => o.id === d.id);
    if (!obj) return;
    let html = `<strong>${obj.course}</strong>`;
    html += `<div class="tt-desc">${obj.description}</div>`;
    html += `<div class="tt-tags"><strong>Tags:</strong> ${obj.tags.join(', ')}</div>`;
    if (d.cluster !== undefined && d.cluster !== null) {
        const name = getClusterDisplayName(d.cluster);
        html += `<div class="tt-cluster">${name}</div>`;
    }
    tooltip.style('display', 'block').html(html);
    moveTooltip(event);
}

function moveTooltip(event) {
    const tw = 320, th = 160;
    let x = event.clientX + 16;
    let y = event.clientY + 10;
    if (x + tw > window.innerWidth)  x = event.clientX - tw - 10;
    if (y + th > window.innerHeight) y = event.clientY - th - 10;
    tooltip.style('left', x + 'px').style('top', y + 'px');
}

function hideTooltip() { tooltip.style('display', 'none'); }

// ── Colour Helper ─────────────────────────────────────────────────────────────

function getNodeColor(d) {
    if (d.cluster !== undefined && d.cluster !== null && d.cluster !== -1 && clusterColors.length > 0) {
        return clusterColors[d.cluster % clusterColors.length];
    }
    return '#888';
}

function getNodeLabel(d) {
    const obj = objectives.find(o => o.id === d.id);
    if (!obj) return d.id;
    const s = obj.description;
    return s.length > 38 ? s.slice(0, 38) + '…' : s;
}

// ── Node Shape Path Helper ─────────────────────────────────────────────────────

/**
 * Returns a d3 symbol generator for the current node shape.
 * The 'r' parameter controls approximate visual size matching circle radius.
 */
function _shapePathFor(shape, r) {
    // D3 symbol size is area in square pixels.
    const area = Math.PI * r * r;
    switch (shape) {
        case 'square': {
            // d3.symbolSquare is reliably available
            return d3.symbol().type(d3.symbolSquare).size(area * 1.27)();
        }
        case 'hexagon': {
            // Draw a regular hexagon manually (flat-top orientation).
            // d3.symbolHexagon was added in d3 v7.6 but may not be in all builds.
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i - 30);
                pts.push([r * Math.cos(a), r * Math.sin(a)]);
            }
            return 'M' + pts.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join('L') + 'Z';
        }
        case 'triangle': {
            return d3.symbol().type(d3.symbolTriangle).size(area * 1.1)();
        }
        case 'circle':
        default: {
            return d3.symbol().type(d3.symbolCircle).size(area)();
        }
    }
}

// ── Legend ────────────────────────────────────────────────────────────────────

let legendGroup = null;

// Tracks the legend's position as a fraction of window dimensions {fx, fy}.
// null means "use the corner preset from displayProperties.legend.position".
// Stored as fractions so position stays correct across resizes, sidebar
// toggles, and orientation changes — window size is always the reference.
let _legendFrac = null;

function updateLegend() {
    if (legendGroup) { legendGroup.remove(); legendGroup = null; }
    if (!displayProperties.legend.show || numClusters === 0 || !stateProperties.lastDataset) return;

    const dataset = stateProperties.lastDataset;
    updateDimensions();

    const clusterInfo = {};
    dataset.nodes.forEach(n => {
        if (n.cluster === undefined || n.cluster === null || n.cluster === -1) return;
        if (!clusterInfo[n.cluster]) clusterInfo[n.cluster] = { count: 0 };
        clusterInfo[n.cluster].count++;
    });

    const hasNoise = dataset.nodes.some(n => n.cluster === -1);
    const sortedClusters = Object.keys(clusterInfo).map(Number).sort((a, b) => a - b);
    if (!sortedClusters.length && !hasNoise) return;

    const ls  = displayProperties.legend.line_spacing;
    const pad = displayProperties.legend.padding;
    const fs  = displayProperties.legend.text_size;

    const showTitle   = displayProperties.legend.showTitle !== false;
    const autoTitle   = { byCourse: 'Courses', byDepartment: 'Departments' }[currentClusterAlgorithm] || 'Clusters';
    const legendTitle = showTitle ? (displayProperties.legend.customTitle || autoTitle) : '';

    const allEntries = sortedClusters.map(c => ({
        cluster: c,
        label:   `${getClusterDisplayName(c)} (${clusterInfo[c].count})`,
        noise:   false,
    }));
    if (hasNoise) {
        const noiseCount = dataset.nodes.filter(n => n.cluster === -1).length;
        allEntries.push({ cluster: -1, label: `Noise (${noiseCount})`, noise: true });
    }
    const totalRows = allEntries.length;

    // ── Measure text widths ─────────────────────────────────────────────────
    const _testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    _testSvg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    document.body.appendChild(_testSvg);
    const _testEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    _testEl.style.fontSize = fs + 'px';
    _testEl.style.fontWeight = '600';
    _testSvg.appendChild(_testEl);

    let maxEntryW = 80;
    for (const e of allEntries) {
        _testEl.textContent = e.label;
        const w = _testEl.getBBox ? _testEl.getBBox().width : e.label.length * fs * 0.6;
        if (w > maxEntryW) maxEntryW = w;
    }
    _testEl.textContent = legendTitle;
    _testEl.style.fontWeight = '700';
    const titleW = showTitle ? (_testEl.getBBox ? _testEl.getBBox().width : legendTitle.length * (fs + 1) * 0.65) : 0;
    document.body.removeChild(_testSvg);

    // ── Swatch + text offset (font-size-relative) ────────────────────────────
    const swR   = Math.max(4, Math.round(fs * 0.45));  // swatch half-width
    const swGap = Math.max(4, Math.round(fs * 0.35));  // gap between swatch and text
    const textX = swR * 2 + swGap;                     // text left edge within entry group

    // ── Multi-column layout ──────────────────────────────────────────────────
    // Full entry width = left pad + swatch diameter + gap + text width + right pad
    const entryInnerW = textX + maxEntryW;             // swatch area + measured text
    const colEntryW   = Math.ceil(entryInnerW + pad);  // per-column slot width (includes inter-col gap)
    const headerH     = showTitle ? pad + Math.ceil(fs * 1.6) : pad + Math.round(ls * 0.5);  // title row height scales with fs
    const maxLegendH  = Math.floor(height * 0.88);
    const maxRowsPerCol = Math.max(1, Math.floor((maxLegendH - headerH - pad) / ls));
    const numCols     = Math.min(3, Math.ceil(totalRows / maxRowsPerCol));
    const rowsPerCol  = Math.ceil(totalRows / numCols);

    const legendW  = Math.ceil(pad + colEntryW * numCols + pad);
    const legendW2 = Math.max(legendW, Math.ceil(titleW + pad * 2));
    const legendH  = headerH + rowsPerCol * ls - Math.round(ls * 0.5) + pad;

    // ── Position ─────────────────────────────────────────────────────────────
    // Always use window dimensions as the reference so position is stable
    // regardless of sidebar state, screen size, or orientation.
    const W = window.innerWidth;
    const H = window.innerHeight;
    const pos = displayProperties.legend.position || 'top-right';
    const margin = 8;

    let tx, ty;
    if (_legendFrac !== null) {
        // Convert stored fraction back to pixels for this render
        tx = Math.round(_legendFrac.fx * W);
        ty = Math.round(_legendFrac.fy * H);
    } else {
        if (pos === 'top-left')          { tx = margin;               ty = margin; }
        else if (pos === 'bottom-right') { tx = W - legendW2 - margin; ty = H - legendH - margin; }
        else if (pos === 'bottom-left')  { tx = margin;               ty = H - legendH - margin; }
        else /* top-right */             { tx = W - legendW2 - margin; ty = margin; }
    }

    // Clamp so legend never leaves window bounds
    tx = Math.max(0, Math.min(W - legendW2, tx));
    ty = Math.max(0, Math.min(H - legendH,  ty));

    // ── Draw ─────────────────────────────────────────────────────────────────
    legendGroup = svg.append('g')
        .attr('class', 'legend-group')
        .attr('transform', `translate(${tx}, ${ty})`);

    legendGroup.append('rect')
        .attr('class', 'legend-bg')
        .attr('width', legendW2)
        .attr('height', legendH)
        .attr('rx', 5).attr('ry', 5);

    if (showTitle) {
        legendGroup.append('g')
            .attr('transform', `translate(${pad}, ${Math.round(headerH / 2)})`)
            .append('text')
            .attr('class', 'legend-title')
            .attr('x', 0).attr('y', 0)
            .attr('dominant-baseline', 'central')
            .style('font-size', (fs + 1) + 'px')
            .text(legendTitle);
    }

    // Use the current node shape for legend swatches
    const shape = displayProperties.node.shape || 'circle';

    allEntries.forEach((entry, i) => {
        const col = Math.floor(i / rowsPerCol);
        const row = i % rowsPerCol;
        const x   = pad + col * colEntryW;
        const y   = headerH + row * ls;

        const eg = legendGroup.append('g').attr('transform', `translate(${x}, ${y})`);

        const _triH = Math.sqrt(4 * (Math.PI * swR * swR * 1.1) / Math.sqrt(3)) * Math.sqrt(3) / 2;
        const swYOffset = (shape === 'triangle') ? Math.round(_triH / 6) : 0;
        const swTransform = `translate(${swR}, ${swYOffset})`;

        if (entry.noise) {
            eg.append('path')
                .attr('d', _shapePathFor(shape, swR))
                .attr('transform', swTransform)
                .attr('fill', '#ccc')
                .attr('stroke', '#999')
                .attr('stroke-width', 0.5)
                .style('stroke-dasharray', '2 1');
            eg.append('text')
                .attr('x', textX).attr('y', 0)
                .attr('dominant-baseline', 'central')
                .style('font-size', fs + 'px').style('fill', '#888')
                .text(entry.label);
        } else {
            eg.append('path')
                .attr('d', _shapePathFor(shape, swR))
                .attr('transform', swTransform)
                .attr('fill', clusterColors[entry.cluster % clusterColors.length])
                .attr('stroke', '#333').attr('stroke-width', 0.5);
            eg.append('text')
                .attr('x', textX).attr('y', 0)
                .attr('dominant-baseline', 'central')
                .style('font-size', fs + 'px').style('font-weight', '600')
                .text(entry.label);
        }
    });

    // ── Make legend draggable ─────────────────────────────────────────────────
    let _legDragStart = null;
    legendGroup.style('cursor', 'move').call(
        d3.drag()
            .on('start', function(event) {
                const t = legendGroup.attr('transform') || '';
                const m = t.match(/translate\(([\d.+-]+),\s*([\d.+-]+)\)/);
                _legDragStart = {
                    mx: event.x, my: event.y,
                    lx: m ? parseFloat(m[1]) : tx,
                    ly: m ? parseFloat(m[2]) : ty
                };
                event.sourceEvent.stopPropagation();
            })
            .on('drag', function(event) {
                if (!_legDragStart) return;
                const nx = _legDragStart.lx + (event.x - _legDragStart.mx);
                const ny = _legDragStart.ly + (event.y - _legDragStart.my);
                legendGroup.attr('transform', `translate(${nx},${ny})`);
            })
            .on('end', function(event) {
                if (!_legDragStart) return;
                let nx = _legDragStart.lx + (event.x - _legDragStart.mx);
                let ny = _legDragStart.ly + (event.y - _legDragStart.my);
                // Clamp to window bounds
                nx = Math.max(0, Math.min(W - legendW2, nx));
                ny = Math.max(0, Math.min(H - legendH,  ny));
                legendGroup.attr('transform', `translate(${nx},${ny})`);
                // Store as fraction of window so position survives any resize
                _legendFrac = { fx: nx / W, fy: ny / H };
                _legDragStart = null;
            })
    );
}

// ── Display Init & Update ─────────────────────────────────────────────────────

function initializeDisplay({ nodes, links } = stateProperties.lastDataset) {
    g.selectAll('*').remove();

    link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line');

    node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes, d => d.id)
        .enter()
        .append('g')
        .attr('class', 'node');

    createNodeFeatures();
}

function createNodeFeatures() {
    const shape = displayProperties.node.shape || 'circle';
    const r = displayProperties.node.radius;

    node_dots = node.append('path')
        .attr('class', 'node-shape')
        .attr('d', _shapePathFor(shape, r))
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', '#222')
        .attr('stroke-width', 0.5)
        .on('mouseover', showTooltip)
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip)
        .on('click', (e, d) => {
            if (d.fx !== null && d.fx !== undefined) { d.fx = null; d.fy = null; }
            else { d.fx = d.x; d.fy = d.y; }
        });

    node_text = node.append('text')
        .attr('class', 'node-text')
        .attr('dx', displayProperties.node.x_offset)
        .attr('dy', displayProperties.node.y_offset)
        .text(d => getNodeLabel(d))
        .style('text-anchor', displayProperties.node.justify)
        .style('alignment-baseline', 'central')
        .style('display', displayProperties.node.showLabels ? null : 'none');
}

function updateDisplay(time = stateProperties.transition) {
    const t = d3.transition().duration(time).ease(d3.easeLinear);
    const shape = displayProperties.node.shape || 'circle';
    const r = displayProperties.node.radius;

    node_dots.transition(t)
        .attr('d', _shapePathFor(shape, r))
        .attr('fill', d => getNodeColor(d));

    link.transition(t)
        .attr('stroke-width', displayProperties.edge.width)
        .attr('stroke', '#999')
        .attr('stroke-opacity', d => {
            const w = (typeof d.weight === 'number') ? d.weight : 0.5;
            const base = displayProperties.edge.opacity;
            // Scale around the base: weak edges get less, strong edges get more
            return Math.max(0.03, Math.min(0.95, base * (0.4 + 1.2 * w)));
        });

    node_text
        .style('font-size', displayProperties.node.text_size + 'px')
        .attr('dx', displayProperties.node.x_offset)
        .attr('dy', displayProperties.node.y_offset)
        .style('text-anchor', displayProperties.node.justify)
        .style('display', displayProperties.node.showLabels ? null : 'none');
}

// ── Simulation ────────────────────────────────────────────────────────────────

function startSimulation({ nodes } = stateProperties.lastDataset) {
    updateDimensions();
    simulation.nodes(nodes);
    initializeDisplay();
    simulation.on('tick', ticked);
    initializeForces();
    draghandler.call(draghandler, node);
    svg.call(zoom);
    updateDisplay(stateProperties.transition);
}

function updateSimulation({ nodes, links } = stateProperties.lastDataset) {
    node = node.data(nodes, d => d.id);
    link = link.data(links, d => {
        const s = typeof d.source === 'object' ? d.source.id : d.source;
        const t = typeof d.target === 'object' ? d.target.id : d.target;
        return s + '-' + t;
    });

    node.exit().transition().remove();
    link.exit().remove();

    node = node.enter().append('g').attr('class', 'node').merge(node);
    link = link.enter().append('line').merge(link);

    if (node_dots) { node_dots.remove(); node_text.remove(); }
    createNodeFeatures();
    draghandler.call(draghandler, node);

    simulation.nodes(nodes);
    simulation.alpha(forceProperties.alpha.restart).restart();
}

function initializeForces() {
    simulation
        .force('collide', d3.forceCollide())
        .force('link', d3.forceLink())
        .force('center', d3.forceCenter())
        .force('forceX', d3.forceX())
        .force('forceY', d3.forceY())
        .force('charge', d3.forceManyBody());
    updateForces();
}

function updateForces(links = (stateProperties.lastDataset || {}).links || []) {
    updateDimensions();

    simulation.force('center')
        .x(width  * forceProperties.center.x)
        .y(height * forceProperties.center.y);

    simulation.force('charge')
        .strength(forceProperties.charge.strength * (forceProperties.charge.enabled ? 1 : 0))
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);

    simulation.force('collide')
        .strength(forceProperties.collide.strength * (forceProperties.collide.enabled ? 1 : 0))
        .radius(forceProperties.collide.relativeRadius * displayProperties.node.radius)
        .iterations(forceProperties.collide.iterations);

    simulation.force('forceX')
        .strength(forceProperties.forceX.strength * (forceProperties.forceX.enabled ? 1 : 0))
        .x(width  * forceProperties.forceX.x);

    simulation.force('forceY')
        .strength(forceProperties.forceY.strength * (forceProperties.forceY.enabled ? 1 : 0))
        .y(height * forceProperties.forceY.y);

    simulation.force('link',
        d3.forceLink(links)
            .id(d => d.id)
            .iterations(forceProperties.link.iterations)
            .distance(d => {
                const w  = (typeof d.weight === 'number') ? d.weight : 0.5;
                const lo = 10, hi = forceProperties.link.distance;
                return lo + (hi - lo) * (1 - w);
            })
            .strength(d => {
                if (!forceProperties.link.enabled) return 0;
                const w = (typeof d.weight === 'number') ? d.weight : 0.5;
                return w * forceProperties.link.strength;
            })
    );
    // NOTE: intentionally no restart() here — callers that want to kick the
    // simulation must call restartSimulation() explicitly.
}

function restartSimulation() {
    if (!forceProperties.alpha.enabled) return;
    simulation.alpha(forceProperties.alpha.restart).restart();
}

function updateAll(time = stateProperties.transition) {
    updateForces();
    restartSimulation();
    updateDisplay(time);
}

// ── Tick ──────────────────────────────────────────────────────────────────────

function ticked() {
    if (link) {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    }
    if (node) {
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }
    d3.select('#alpha-value').style('flex-basis', (simulation.alpha() * 100) + '%');
}

// ── Drag ──────────────────────────────────────────────────────────────────────

function dragstarted(e, d) {
    if (!e.active) simulation.alphaTarget(forceProperties.alpha.targetHigh).restart();
    d.fx = d.x; d.fy = d.y;
}
function dragged(e, d) { d.fx = e.x; d.fy = e.y; }
function dragended(e, d) {
    if (!e.active) simulation.alphaTarget(forceProperties.alpha.targetLow);
    d.fx = null; d.fy = null;
}

const draghandler = d3.drag()
    .on('start', dragstarted)
    .on('drag',  dragged)
    .on('end',   dragended);

draghandler.call = function(_, selection) {
    selection.call(d3.drag()
        .on('start', dragstarted)
        .on('drag',  dragged)
        .on('end',   dragended));
};

// ── Zoom ──────────────────────────────────────────────────────────────────────

const zoom = d3.zoom().on('zoom', e => applyCombinedTransform());

// ── Resize ───────────────────────────────────────────────────────────────────

d3.select(window).on('resize', () => {
    updateDimensions();
    updateForces();   // recalculates center/charge/etc. for new dimensions; no restart
    updateLegend();
});

// ── Export Source Blocks ──────────────────────────────────────────────────────
// The exported file lands in the same directory as index.html, so all
// relative <link> and <script src> paths resolve identically.  No inlining
// or self-registration is required.

function _buildSourceBlocks() {
    const cssBlock = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l => `<link rel="stylesheet" href="${l.getAttribute('href')}">`)
        .join('\n');

    const jsBlock = Array.from(document.querySelectorAll('script[src]'))
        .map(tag => `<script src="${tag.getAttribute('src')}"><\/script>`)
        .join('\n');

    return { cssBlock, jsBlock };
}

// ── Export ────────────────────────────────────────────────────────────────────

function _defaultExportFilename() {
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    return String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
         + p(now.getHours()) + p(now.getMinutes());
}

function exportState() {
    const statusEl = document.getElementById('export-status');
    if (statusEl) { statusEl.textContent = 'Bundling…'; statusEl.style.display = 'block'; }

    const { cssBlock, jsBlock } = _buildSourceBlocks();

    try {
        const dataset = stateProperties.lastDataset;
        const zt = d3.zoomTransform(svg.node());
        const state = {
            version:                 3,
            timestamp:               new Date().toISOString(),
            objectives:              objectives,
            allTags:                 allTags,
            tagCounts:               tagCounts,
            excludedCourses:         [...excludedCourses],
            nodes:                   dataset ? dataset.nodes.map(n => ({
                                         id: n.id, x: n.x, y: n.y,
                                         fx: n.fx ?? null, fy: n.fy ?? null,
                                         cluster: n.cluster
                                     })) : [],
            forceProperties:         JSON.parse(JSON.stringify(forceProperties)),
            displayProperties:       JSON.parse(JSON.stringify(displayProperties)),
            edgeProperties:          JSON.parse(JSON.stringify(edgeProperties)),
            currentClusterAlgorithm: currentClusterAlgorithm,
            clusterParams:           JSON.parse(JSON.stringify(clusterParams)),
            clusterSeed:             clusterSeed,
            clusterLabels:           clusterLabels,
            numClusters:             numClusters,
            zoomTransform:           { k: zt.k, x: zt.x, y: zt.y },
            legendFrac:              _legendFrac ? { fx: _legendFrac.fx, fy: _legendFrac.fy } : null,
        };

        const bodyClone = document.body.cloneNode(true);
        bodyClone.querySelectorAll('script').forEach(s => s.remove());
        bodyClone.querySelector('#tooltip')?.remove();
        const svgEl = bodyClone.querySelector('svg.networkx');
        if (svgEl) svgEl.innerHTML = '';
        ['edge-mode-ui', 'cluster-params-ui', 'cluster-info-dl', 'cluster-status',
         'course-chips', 'course-chips-summary'].forEach(id => {
            const el = bodyClone.querySelector(`#${id}`);
            if (el) el.innerHTML = '';
        });

        const exportStatusEl = bodyClone.querySelector('#export-status');
        if (exportStatusEl) {
            exportStatusEl.textContent = '';
            exportStatusEl.style.display = 'none';
        }

        // Always open with sidebar hidden — recipient sees the graph first.
        // (Applied via class="sidebar-hidden" on the <body> tag in the template.)

        // Always export with the export section collapsed.
        const exportHeaders = bodyClone.querySelectorAll('.section-header');
        exportHeaders.forEach(hdr => {
            if (hdr.querySelector('label') &&
                hdr.querySelector('label').textContent.trim() === 'export') {
                hdr.classList.add('collapsed');
                const body = hdr.nextElementSibling;
                if (body && body.classList.contains('section-body')) {
                    body.classList.add('hidden');
                }
            }
        });

        const bodyHTML = bodyClone.innerHTML;

        // Reproduce the main inline script block verbatim so every function
        // defined there (toggleSection, toggleInfo, setNodeShape, etc.) is
        // present in the export without having to maintain a hand-copied list.
        const mainInlineEl = document.getElementById('main-inline-script');
        const inlineScriptContent = mainInlineEl ? mainInlineEl.textContent : '';

        const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta charset="UTF-8">
<title>USAFA Core Objectives</title>
${cssBlock}
</head>
<body class="sidebar-hidden">
<script>
/* ── Exported state ─────────────────────────────── */
window.__EXPORTED_STATE__ = ${JSON.stringify(state)};
<\/script>
${bodyHTML}
${jsBlock}
<script id="main-inline-script">
${inlineScriptContent}
<\/script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        const fnInput = document.getElementById('export-filename');
        const fnVal = (fnInput && fnInput.value.trim()) || _defaultExportFilename();
        a.download = fnVal.replace(/\.html$/i, '') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (statusEl) {
            statusEl.textContent = 'Exported ✓';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    } catch (err) {
        console.error('Export failed:', err);
        if (statusEl) statusEl.textContent = `Export failed: ${err.message}`;
    }
}

// ── Restore Exported State ────────────────────────────────────────────────────

function restoreExportedState(state) {
    if (!state || state.version < 3) return;

    objectives      = state.objectives      || [];
    allTags         = state.allTags         || [];
    tagCounts       = state.tagCounts       || {};
    excludedCourses = new Set(state.excludedCourses || []);

    deepAssign(forceProperties,   state.forceProperties   || {});
    deepAssign(displayProperties, state.displayProperties || {});
    deepAssign(edgeProperties,    state.edgeProperties    || {});

    currentClusterAlgorithm = state.currentClusterAlgorithm || 'louvain';
    deepAssign(clusterParams, state.clusterParams || {});
    clusterSeed   = state.clusterSeed ?? null;
    clusterLabels = state.clusterLabels || {};
    numClusters   = state.numClusters  || 0;

    const statusEl = document.getElementById('data-status');
    if (statusEl && objectives.length) {
        statusEl.textContent = `${objectives.length} objectives · ${allTags.length} unique tags`;
        statusEl.className = 'status-loaded';
    }

    renderCourseChips();
    renderEdgeUI();
    renderClusterParamsUI();

    const algoSelect = document.getElementById('cluster-algo');
    if (algoSelect) algoSelect.value = currentClusterAlgorithm;

    restoreSliderValues();

    if (numClusters > 0) clusterColors = getClusterColors(numClusters);

    // Build a position lookup from the saved state so buildObjectiveGraph
    // can seed prevPositions with the right x/y for each node.
    stateProperties.lastDataset = {
        nodes: (state.nodes || []).map(n => ({ ...n })),
        links: []
    };

    const dataset = buildObjectiveGraph();

    // buildObjectiveGraph copies x/y from prevPositions but not fx/fy
    // (those are managed by drag handlers at runtime).
    // Re-apply saved fx/fy for nodes the user had explicitly pinned,
    // and temporarily pin ALL nodes to their x/y so the simulation
    // cannot move them during startup.
    const savedByID = {};
    (state.nodes || []).forEach(n => { savedByID[n.id] = n; });

    dataset.nodes.forEach(n => {
        const saved = savedByID[n.id] || {};
        // Temporarily pin to saved position — prevents any sim tick from moving nodes.
        n.fx = n.x;
        n.fy = n.y;
    });

    stateProperties.lastDataset = dataset;

    // Initialise SVG / forces / drag / zoom without running the simulation.
    startSimulation();
    simulation.stop();
    simulation.alpha(0).alphaTarget(0);

    // Render nodes at their saved positions — ticked() is the only function
    // that sets the SVG transform attribute on nodes, and with the sim stopped
    // it never fires automatically.
    ticked();

    // Unpin nodes the user hadn't explicitly dragged-and-pinned,
    // so future "Run layout" calls can move them freely.
    dataset.nodes.forEach(n => {
        const saved = savedByID[n.id] || {};
        if (saved.fx == null) { n.fx = null; n.fy = null; }
    });

    updateDisplay(0);

    // Restore zoom/pan
    if (state.zoomTransform) {
        const zt = state.zoomTransform;
        zoom.transform(svg, d3.zoomIdentity.translate(zt.x, zt.y).scale(zt.k));
    }

    // Restore dragged legend position (must come before updateLegend)
    _legendFrac = state.legendFrac || null;

    updateLegend();
}

function deepAssign(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])
            && key in target && typeof target[key] === 'object') {
            deepAssign(target[key], source[key]);
        } else if (key in target) {
            target[key] = source[key];
        }
    }
}

function restoreSliderValues() {
    const fp = forceProperties;
    const dp = displayProperties;

    const pairs = [
        ['collide-strength',    fp.collide.strength],
        ['collide-rel-radius',  fp.collide.relativeRadius],
        ['collide-iterations',  fp.collide.iterations],
        ['charge-strength',     fp.charge.strength],
        ['charge-min-distance', fp.charge.distanceMin],
        ['charge-max-distance', fp.charge.distanceMax],
        ['link-strength',       fp.link.strength],
        ['link-distance',       fp.link.distance],
        ['link-iterations',     fp.link.iterations],
        ['node-radius',         dp.node.radius],
        ['edge-width',          dp.edge.width],
        ['edge-opacity',        dp.edge.opacity],
        ['node-text-size',      dp.node.text_size],
        ['node-text-x-offset',  dp.node.x_offset],
        ['legend-text-size',    dp.legend.text_size],
        ['legend-line-spacing', dp.legend.line_spacing],
        ['legend-padding',      dp.legend.padding],
    ];

    for (const [outputId, value] of pairs) {
        const output = document.getElementById(outputId);
        if (!output) continue;
        output.textContent = value;
        const slider = output.closest('label')?.querySelector('input[type=range]');
        if (slider) slider.value = value;
    }

    const cbMap = {
        'collide-enabled': fp.collide.enabled,
        'charge-enabled':  fp.charge.enabled,
        'link-enabled':    fp.link.enabled,
        'show-labels-cb':  dp.node.showLabels,
        'show-legend-cb':       dp.legend.show,
        'show-legend-title-cb': dp.legend.showTitle !== false,
    };
    for (const [id, val] of Object.entries(cbMap)) {
        const el = document.getElementById(id);
        if (el) el.checked = val;
    }

    // Restore node shape buttons
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shape === dp.node.shape);
    });

    // Restore legend title input
    const legTitleEl = document.getElementById('legend-title-input');
    if (legTitleEl) legTitleEl.value = dp.legend.customTitle || '';

    // Restore legend position select
    const legPosEl = document.getElementById('legend-position');
    if (legPosEl) legPosEl.value = dp.legend.position || 'top-right';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const fnEl = document.getElementById('export-filename');
    if (fnEl && !fnEl.value) fnEl.value = _defaultExportFilename();
});
