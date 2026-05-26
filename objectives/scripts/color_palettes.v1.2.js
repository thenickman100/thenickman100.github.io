// color_palettes.v1.2.js
// color_palettes.js
// Utility functions for generating color palettes.

const continuousColorSchemes = [
    "Blues","Greens","Greys","Oranges","Purples","Reds",
    "BuGn","BuPu","GnBu","OrRd","PuBuGn","PuBu","PuRd","RdPu",
    "YlGnBu","YlGn","YlOrBr","YlOrRd","Cividis","Viridis","Inferno",
    "Magma","Plasma","Warm","Cool","CubehelixDefault","Turbo",
    "BrBG","PRGn","PiYG","PuOr","RdBu","RdGy","RdYlBu","RdYlGn",
    "Spectral","Rainbow","Sinebow",
];

const discreteColorSchemes = [
    "Category10","Accent","Dark2","Paired","Pastel1","Pastel2",
    "Set1","Set2","Set3","Tableau10",
];

function makePalette(name, n, reverse = false) {
    let colors;
    if (continuousColorSchemes.includes(name)) {
        if (d3[`scheme${name}`] && d3[`scheme${name}`][n]) {
            colors = [...d3[`scheme${name}`][n]];
        } else {
            const interpolate = d3[`interpolate${name}`];
            colors = [];
            for (let i = 0; i < n; ++i) {
                colors.push(d3.rgb(interpolate(i / Math.max(n - 1, 1))).hex());
            }
        }
    } else if (discreteColorSchemes.includes(name)) {
        colors = [...d3[`scheme${name}`]];
    }
    return reverse ? colors.reverse() : colors;
}

/**
 * Generate a palette of n distinct colors for cluster assignment.
 * Cycles through a carefully chosen multi-scheme pool for large n.
 */
function getClusterColors(n) {
    if (n === 0) return [];

    // Primary pool: Tableau10 + Dark2 + Set1 = 28 distinct colors
    const pool = [
        ...d3.schemeTableau10,
        ...d3.schemeDark2,
        ...d3.schemeSet1,
        ...d3.schemeSet2,
        ...d3.schemeAccent,
    ];

    if (n <= pool.length) {
        return pool.slice(0, n);
    }

    // For very large n, interpolate Rainbow
    const colors = [...pool];
    const extra = n - pool.length;
    for (let i = 0; i < extra; i++) {
        colors.push(d3.interpolateRainbow(i / extra));
    }
    return colors;
}
