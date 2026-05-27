// display_graph.v2.69.js


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

// ── Rotation State ────────────────────────────────────────────────────────────────────────────────
let _rotationDeg = 0;

// Returns the centroid of all current nodes in node-coordinate space.
// Used as the SVG rotate() pivot so rotation is stable regardless of sidebar
// state, SVG bounding rect, or window size. The node centroid lives entirely
// in node-space and never shifts when the sidebar opens or closes on mobile.
function _getNodeCentroid() {
    const ns = (stateProperties.lastDataset || {}).nodes || [];
    if (!ns.length) return { cx: 0, cy: 0 };
    const cx = ns.reduce((s, n) => s + (n.x || 0), 0) / ns.length;
    const cy = ns.reduce((s, n) => s + (n.y || 0), 0) / ns.length;
    return { cx, cy };
}

function applyRotation(deg) {
    _rotationDeg = deg;
    applyCombinedTransform();
}

function applyCombinedTransform() {
    // Pivot on the node centroid — a stable point in node-coordinate space.
    // Screen-derived pivots (getBoundingClientRect, window.innerWidth/2) shift
    // when the sidebar overlay opens/closes on mobile, causing the graph to
    // jump to a wrong rotation centre. The node centroid is unaffected by any
    // of that and gives consistent behaviour in all sidebar states.
    const { cx, cy } = _getNodeCentroid();
    const z = d3.zoomTransform(svg.node());
    g.attr('transform', `${z} rotate(${_rotationDeg},${cx},${cy})`);
}
// ── SVG Setup ─────────────────────────────────────────────────────────────────

let link, node, node_dots, node_text;
const svg  = d3.select('.networkx');
const g    = svg.append('g');
let width  = 800;
let height = 600;

function updateDimensions() {
    // Read the SVG's own rendered area rather than the raw window dimensions.
    // window.innerWidth/Height on mobile includes browser chrome (address bar,
    // bottom navigation) that is not available to the SVG, and it ignores any
    // CSS constraints on the container — causing force-center and refit
    // calculations to target a region the graph canvas never occupies.
    const rect = svg.node().getBoundingClientRect();
    width  = rect.width  || window.innerWidth;
    height = rect.height || window.innerHeight;
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
    // Support both mouse and touch events
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? window.innerWidth  / 2;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? window.innerHeight / 2;

    const W = window.innerWidth, H = window.innerHeight;
    const margin = 10;

    // In mobile landscape, the legend occupies the left strip — keep tooltip
    // out of that zone by shifting the left boundary rightward.
    const legendReserved = _isMobileLandscape() && numClusters > 0 && legendGroup
        ? (legendGroup.node().getBBox().width + margin * 2)
        : 0;
    const leftBound = Math.max(margin, legendReserved);

    // Max tooltip width fits in the remaining space
    const maxW = W - leftBound - margin;
    tooltip.style('max-width', maxW + 'px');

    // Measure actual rendered size after max-width is applied
    const ttNode = tooltip.node();
    const tw = Math.min(ttNode.offsetWidth  || 300, maxW);
    const th = Math.min(ttNode.offsetHeight || 160, H - margin * 2);

    // Prefer: right of cursor, then left; below cursor, then above
    let x = clientX + 16;
    let y = clientY + 10;
    if (x + tw > W - margin) x = clientX - tw - 10;
    if (y + th > H - margin) y = clientY - th - 10;

    // Hard clamp to safe area
    x = Math.max(leftBound, Math.min(W - tw - margin, x));
    y = Math.max(margin,    Math.min(H - th - margin, y));

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
let _skipMobileRefit = false;  // set true during export restore to preserve saved zoom

// Returns true on a touch device in landscape orientation.
// Uses aspect ratio (innerHeight vs innerWidth) rather than a width pixel
// threshold — innerWidth can read as the unscaled desktop width on some
// mobile browsers before the viewport meta tag has been applied.
function _isMobileLandscape() {
    return (
        window.innerWidth > window.innerHeight &&   // landscape
        ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    );
}

function _isMobile() {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

// Refit the graph for mobile viewports using real legend dimensions.
// portrait: graph in upper zone, legend centered at bottom.
// landscape: legend on left, graph fills the right.
//
// SVG transform order in applyCombinedTransform:
//   g.transform = "translate(tx,ty) scale(k) rotate(deg, cx, cy)"
//
// SVG applies transforms RIGHT TO LEFT, so for a node at (nx, ny):
//   1. rotate(deg, cx, cy)  — pivot is the node centroid in node-coordinate space
//   2. scale(k)
//   3. translate(tx, ty)
//
// Final screen position: (tx + k*rx,  ty + k*ry)
// where (rx,ry) = node rotated around the node centroid.
//
// So to refit we must:
//   a. Rotate every node around the node centroid (same pivot as applyCombinedTransform).
//   b. Compute the bounding box of those rotated positions.
//   c. Choose k to fit that box into the available screen area.
//   d. Choose tx/ty to centre that box in the available screen area.
function _refitMobileGraph(realLegendW, realLegendH) {
    const ns = stateProperties.lastDataset && stateProperties.lastDataset.nodes;
    if (!ns || !ns.length) return;

    // Use window dimensions for the available screen area calculations.
    const W = window.innerWidth, H = window.innerHeight;
    const margin = 10;
    const hasLegend = numClusters > 0 && displayProperties.legend.show;
    const legW = realLegendW || 0;
    const legH = realLegendH || 0;
    const legMargin = hasLegend ? margin : 0;

    // Rotate every node around the node centroid — the same pivot used by
    // applyCombinedTransform(). Using the centroid keeps the bounding box
    // calculation consistent with what the SVG actually renders, regardless
    // of sidebar state or screen geometry.
    const { cx: pivX, cy: pivY } = _getNodeCentroid();
    const rad    = (_rotationDeg || 0) * Math.PI / 180;
    const cosR   = Math.cos(rad), sinR = Math.sin(rad);
    const rotated = ns.map(n => {
        const dx = n.x - pivX, dy = n.y - pivY;
        return {
            rx: pivX + dx * cosR - dy * sinR,
            ry: pivY + dx * sinR + dy * cosR,
        };
    });

    // Bounding box of rotated node positions.
    const rMinX = Math.min(...rotated.map(p => p.rx));
    const rMinY = Math.min(...rotated.map(p => p.ry));
    const rMaxX = Math.max(...rotated.map(p => p.rx));
    const rMaxY = Math.max(...rotated.map(p => p.ry));
    const rGraphW = rMaxX - rMinX || 1;
    const rGraphH = rMaxY - rMinY || 1;

    // Available screen area.
    let availW, availH, graphLeft, graphTop;
    if (_isMobileLandscape()) {
        availW    = W - (hasLegend ? legW + legMargin : 0);
        availH    = H;
        graphLeft = hasLegend ? legW + legMargin : 0;
        graphTop  = 0;
    } else {
        availW    = W;
        const legendTop = hasLegend ? H - legH - legMargin : H;
        availH    = legendTop - margin;
        graphLeft = 0;
        graphTop  = margin;
    }

    // Scale to fit rotated bounding box into available area.
    const k = Math.min(availW / rGraphW, availH / rGraphH) * 0.88;

    // Centre the rotated bounding box in the available area.
    // Screen pos of a rotated point p = (tx + k*p.rx, ty + k*p.ry).
    // We want:  tx + k*(rMinX+rMaxX)/2  =  graphLeft + availW/2
    const tx = graphLeft + availW / 2 - k * (rMinX + rMaxX) / 2;
    const ty = graphTop  + availH / 2 - k * (rMinY + rMaxY) / 2;

    console.log('[refit]', {
        W, H, legW, legH, hasLegend, rotation: _rotationDeg,
        rGraphW: rGraphW.toFixed(1), rGraphH: rGraphH.toFixed(1),
        k: k.toFixed(3), tx: tx.toFixed(1), ty: ty.toFixed(1),
        landscape: _isMobileLandscape(),
        screenL: (tx + k*rMinX).toFixed(1), screenR: (tx + k*rMaxX).toFixed(1),
        screenT: (ty + k*rMinY).toFixed(1), screenB: (ty + k*rMaxY).toFixed(1),
    });
    zoom.transform(svg, d3.zoomIdentity.translate(tx, ty).scale(k));
}

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
    const maxLegendH  = Math.floor(window.innerHeight * 0.88);  // use window height — stable regardless of SVG bounding rect or sidebar state
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

    // Use screen.orientation or aspect ratio instead of innerWidth threshold.
    // On some mobile browsers innerWidth reads the unscaled (desktop) width
    // during initial load before the viewport meta tag has been applied,
    // causing the width < 1024 check to fail and the legend to land top-right.
    const _isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const _isPortrait = window.innerHeight > window.innerWidth;
    const isMobileLand = _isTouch && !_isPortrait;
    const isMobilePort = _isTouch && _isPortrait;

    let tx, ty;
    if (isMobileLand) {
        // Landscape: legend left edge, vertically centered using real legendH
        tx = margin;
        ty = Math.round((H - legendH) / 2);
    } else if (isMobilePort && _legendFrac === null) {
        // Portrait (after refit): center legend horizontally at bottom
        tx = Math.round((W - legendW2) / 2);
        ty = H - legendH - margin;
    } else if (_legendFrac !== null) {
        tx = Math.round(_legendFrac.fx * W);
        ty = Math.round(_legendFrac.fy * H);
    } else {
        if (pos === 'top-left')          { tx = margin;                ty = margin; }
        else if (pos === 'bottom-right') { tx = W - legendW2 - margin; ty = H - legendH - margin; }
        else if (pos === 'bottom-left')  { tx = margin;                ty = H - legendH - margin; }
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

    // Refit graph around the now-known legend dimensions on mobile.
    // Skipped during export restore so the saved zoom transform is preserved.
    if ((isMobileLand || isMobilePort) && !_skipMobileRefit) {
        _refitMobileGraph(legendW2, legendH);
    }
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
        .on('touchstart', (e, d) => { e.preventDefault(); showTooltip(e.touches[0], d); }, { passive: false })
        .on('touchend', (e, d) => { setTimeout(hideTooltip, 1800); })
        .on('click', (e, d) => {
            // Only toggle pin if this was a tap, not the end of a drag
            if (!d._dragMoved) {
                if (d.fx !== null && d.fx !== undefined) { d.fx = null; d.fy = null; }
                else { d.fx = d.x; d.fy = d.y; }
            }
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

    // On mobile, fit the graph into the visible area on first draw.
    // updateLegend() calls _refitMobileGraph() with real legend dimensions
    // once it has rendered; without this call the graph sits at whatever
    // raw coordinates the simulation starts with and can be off-screen.
    // On mobile, delay the initial legend/refit call so the browser has
    // time to finish layout and settle viewport dimensions (address bar,
    // safe areas, etc.) before we measure anything. Without the delay,
    // window.innerHeight can be transiently wrong on first load, causing
    // the legend to be sized and centred against stale dimensions.
    if (_isMobile()) {
        setTimeout(() => {
            updateDimensions();
            updateLegend();
        }, 400);
    }
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

    // forceCenter must target the actual centroid of the current nodes, not a
    // fixed fraction of the SVG viewport. If nodes were spawned (or restored)
    // at coordinates far from width*0.5/height*0.5, forceCenter would drag
    // them across the screen and invalidate any refit zoom that was computed
    // for their original positions.  Using the live node centroid means the
    // center force keeps the cluster in place rather than migrating it.
    const ns = (stateProperties.lastDataset || {}).nodes || [];
    let _cx, _cy;
    if (ns.length > 0) {
        _cx = ns.reduce((s, n) => s + (n.x || 0), 0) / ns.length;
        _cy = ns.reduce((s, n) => s + (n.y || 0), 0) / ns.length;
    } else {
        _cx = width  * forceProperties.center.x;
        _cy = height * forceProperties.center.y;
    }
    simulation.force('center')
        .x(_cx)
        .y(_cy);

    simulation.force('charge')
        .strength(forceProperties.charge.strength * (forceProperties.charge.enabled ? 1 : 0))
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);

    simulation.force('collide')
        .strength(forceProperties.collide.strength * (forceProperties.collide.enabled ? 1 : 0))
        .radius(forceProperties.collide.relativeRadius * displayProperties.node.radius)
        .iterations(forceProperties.collide.iterations);

    // forceX/Y also target the node centroid for the same reason as forceCenter.
    simulation.force('forceX')
        .strength(forceProperties.forceX.strength * (forceProperties.forceX.enabled ? 1 : 0))
        .x(_cx);

    simulation.force('forceY')
        .strength(forceProperties.forceY.strength * (forceProperties.forceY.enabled ? 1 : 0))
        .y(_cy);

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
    d._dragMoved = false;
    d._dragStartX = e.x; d._dragStartY = e.y;
    d._dragIsTouch = e.sourceEvent && e.sourceEvent.type === 'touchstart';
    // On mouse: heat simulation immediately as before.
    // On touch: wait until movement confirmed to avoid heating on tap.
    if (!d._dragIsTouch) {
        if (!e.active) simulation.alphaTarget(forceProperties.alpha.targetHigh).restart();
    }
    d.fx = d.x; d.fy = d.y;
}
function dragged(e, d) {
    if (d._dragIsTouch && !d._dragMoved) {
        const dx = e.x - d._dragStartX, dy = e.y - d._dragStartY;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        d._dragMoved = true;
        if (!e.active) simulation.alphaTarget(forceProperties.alpha.targetHigh).restart();
    } else {
        d._dragMoved = true;
    }
    d.fx = e.x; d.fy = e.y;
}
function dragended(e, d) {
    if (!e.active) simulation.alphaTarget(forceProperties.alpha.targetLow);
    if (d._dragMoved) { d.fx = null; d.fy = null; }
    d._dragMoved = false;
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
    updateForces();
    updateLegend();
});

// On orientation change, refit the graph and legend for the new viewport.
// updateLegend calls _refitMobileGraph with real legend dimensions once drawn.
// Bug fix: a fixed 350 ms delay is not long enough on iOS Safari — the browser
// doesn't update window.innerWidth/Height until layout has fully settled, which
// can take 500 ms or more.  Poll until the dimensions actually change (up to
// ~900 ms in 100 ms increments) so the refit always uses the correct new size.
window.addEventListener('orientationchange', () => {
    const prevW = window.innerWidth;
    const prevH = window.innerHeight;
    const MAX_ATTEMPTS = 9;   // 9 × 100 ms = up to 900 ms

    const check = (attempts) => {
        const dimensionsChanged = window.innerWidth !== prevW || window.innerHeight !== prevH;
        if (dimensionsChanged || attempts <= 0) {
            _legendFrac = null;
            updateDimensions();
            updateForces();
            updateLegend();
        } else {
            setTimeout(() => check(attempts - 1), 100);
        }
    };

    setTimeout(() => check(MAX_ATTEMPTS), 100);
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
            rotationDeg:             _rotationDeg || 0,
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
        // Temporarily pin to saved position — prevents any sim tick from moving nodes.
        n.fx = n.x;
        n.fy = n.y;
        // Zero velocity so restored nodes don't accelerate away on first sim run.
        n.vx = 0;
        n.vy = 0;
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

    // Restore rotation first so applyCombinedTransform uses it immediately.
    _rotationDeg = state.rotationDeg || 0;

    // Restore zoom/pan — but if the saved transform would place the graph
    // off-screen (e.g. opening a desktop export on mobile), refit instead.
    // When rotation is non-zero we skip the overlap heuristic and trust the
    // saved transform directly, since the overlap check doesn't account for
    // rotation and would incorrectly trigger a refit.
    let didRefit = false;
    if (state.zoomTransform) {
        const zt = state.zoomTransform;
        const proposed = d3.zoomIdentity.translate(zt.x, zt.y).scale(zt.k);

        const hasRotation = !!_rotationDeg;
        const ns = dataset.nodes;
        let applyProposed = true;

        if (!hasRotation && ns.length > 0) {
            // Only run the overlap check when there's no rotation.
            const xs = ns.map(n => proposed.applyX(n.x));
            const ys = ns.map(n => proposed.applyY(n.y));
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const W = window.innerWidth, H = window.innerHeight;
            const visW = Math.min(maxX, W) - Math.max(minX, 0);
            const visH = Math.min(maxY, H) - Math.max(minY, 0);
            const graphW = maxX - minX || 1, graphH = maxY - minY || 1;
            const overlapFrac = (visW / graphW) * (visH / graphH);

            if (overlapFrac <= 0.10) {
                applyProposed = false;
                didRefit = true;
                _legendFrac = null;
            }
        }

        if (applyProposed) {
            zoom.transform(svg, proposed);
        }
    }

    // Restore saved legend position only if we didn't refit and we are not in
    // mobile portrait mode. In portrait the legend is always centered at the
    // bottom on first load; restoring a desktop-derived fraction would place it
    // at a proportional x that overflows the narrower screen. The user can still
    // drag the legend to a custom position after the page has loaded.
    const _restoreIsTouch    = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const _restoreIsPortrait = window.innerHeight > window.innerWidth;
    const _restoreIsMobilePort = _restoreIsTouch && _restoreIsPortrait;
    if (!didRefit && !_restoreIsMobilePort) {
        _legendFrac = state.legendFrac || null;
    }

    _skipMobileRefit = true;
    updateLegend();
    _skipMobileRefit = false;


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
