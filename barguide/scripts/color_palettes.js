const recipePalette = {
    top: "#f9c74f",
    recipe1: "#43aa8b",
    recipe1Ingredients: "#90be6d",
    recipe2: "#f3722c",
    recipe2Ingredients: "#f8961e",
    commonIngredientsStroke: "#90be6d",
    commonIngredientsFill: "#f8961e"
};

const continuousColorSchemes = [
    "Blues",
    "Greens",
    "Greys",
    "Oranges",
    "Purples",
    "Reds",
    "BuGn",
    "BuPu",
    "GnBu",
    "OrRd",
    "PuBuGn",
    "PuBu",
    "PuRd",
    "RdPu",
    "YlGnBu",
    "YlGn",
    "YlOrBr",
    "YlOrRd",
    "Cividis",
    "Viridis",
    "Inferno",
    "Magma",
    "Plasma",
    "Warm",
    "Cool",
    "CubehelixDefault",
    "Turbo",
    "BrBG",
    "PRGn",
    "PiYG",
    "PuOr",
    "RdBu",
    "RdGy",
    "RdYlBu",
    "RdYlGn",
    "Spectral",
    "Rainbow",
    "Sinebow",
];

const discreteColorSchemes = [
    "Category10",
    "Accent",
    "Dark2",
    "Paired",
    "Pastel1",
    "Pastel2",
    "Set1",
    "Set2",
    "Set3",
    "Tableau10",
];

function makePalette(name, n, reverse = false) {
    let colors;
    if (continuousColorSchemes.includes(name)) {
        if (d3[`scheme${name}`] && d3[`scheme${name}`][n]) {
            colors = d3[`scheme${name}`][n];
        } else {
            const interpolate = d3[`interpolate${name}`];
            colors = [];
            for (let i = 0; i < n; ++i) {
                colors.push(d3.rgb(interpolate(i / (n - 1))).hex());
            }
        }
    } else if (discreteColorSchemes.includes(name)) {
        colors = d3[`scheme${name}`];
    }
    if (!reverse) {
        return colors;
    } else {
        return colors.reverse();
    }
}

const colorScheme = makePalette("Dark2", 5, false);