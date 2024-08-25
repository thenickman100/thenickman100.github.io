const stateProperties = {
    currentType: null,
    lastDataset: null,
    lastGraph: null,
    lastRecipe1: null,
    lastRecipe2: null,
    buttons: {
        singleRecipe: false,
        doubleRecipe: false
    },
    dragEnabled: true,
    lastClicked: {
        x: null,
        y: null
    },
    transition: 100
};

const displayProperties = {
    node: {
        radius: 10,
        x_offset: 12,
        y_offset: 0,
        text_size: 12,
        justify: "start"
    },
    edge: {
        width: 3.5
    },
    legend: {
        padding_right: 20,
        padding_top: 20,
        line_spacing: 25,
        text_gap: 10,
        text_size: 12
    },
    marker: {
        width: 4.5,
        height: 10
    },
    graph: {
        isDirected: true
    }
};

const forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    collide: {
        enabled: true,
        strength: 1,
        relativeRadius: 1,
        iterations: 6
    },
    charge: {
        enabled: true,
        strength: -200,
        distanceMin: 0,
        distanceMax: 350
    },
    link: {
        enabled: true,
        strength: 0.9,
        distance: 45,
        iterations: 1
    },
    forceX: {
        enabled: false,
        strength: .1,
        x: .5
    },
    forceY: {
        enabled: false,
        strength: .1,
        y: .5
    },
    alpha: {
        enabled: true,
        decay: 0.03,
        restart: 0.9,
        targetHigh: 0.7,
        targetLow: 0
    }
};

let link, node, node_dots, node_text, node_titles, legend, legend_dots, legend_text;
let svg = d3.select(".networkx"),
    width = +svg.node().getBoundingClientRect().width,
    height = +svg.node().getBoundingClientRect().height;
const g = svg.append("g");
let simulation = d3.forceSimulation()
    .alphaDecay(forceProperties.alpha.decay);

let defs = svg.append('defs');
defs.append('marker')
    .attr('id', 'arrowhead')
    .attr("viewBox", [-displayProperties.marker.height, -displayProperties.marker.width / 2, displayProperties.marker.height, displayProperties.marker.width])
    .attr('refX', displayProperties.node.radius)
    .attr("markerWidth", displayProperties.marker.height)
    .attr("markerHeight", displayProperties.marker.width)
    .attr("orient", "auto")
    .append("path")
        .attr("d", d3.line()([[-displayProperties.marker.height, -displayProperties.marker.width / 2], [-displayProperties.marker.height, displayProperties.marker.width / 2], [0, 0]]));

defs.append('marker')
    .attr('id', 'halfarrowhead')
    .attr("viewBox", [-displayProperties.marker.height, -displayProperties.marker.width, displayProperties.marker.height, displayProperties.marker.width])
    .attr('refX', displayProperties.node.radius)
    .attr('refY', displayProperties.edge.width / 2)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("markerWidth", displayProperties.marker.height)
    .attr("markerHeight", displayProperties.marker.width)
    .attr("orient", "auto")
    .append("path")
        .attr("id", "halfarrowheadpath")
        .attr("d", d3.line()([[-displayProperties.marker.height, -displayProperties.marker.width], [-displayProperties.marker.height, 0], [0, 0]]));

const stripeWidth = 5;
const strokeWidth = 1;

const patternScale = stripeWidth + strokeWidth;
const strokeScale = strokeWidth / patternScale;
let stripes = defs.append("pattern")
    .attr("id", "recipeStripes")
    .attr("viewBox", "0,0,8,8")
    .attr("width", 2 * Math.sqrt(2) * patternScale)
    .attr("height", 2 * Math.sqrt(2) * patternScale)
    .attr("patternUnits", "userSpaceOnUse");
stripes.append("polygon")
    .attr("points", "0,0 4,0 0,4")
    .attr("fill", recipePalette.recipe1Ingredients);
stripes.append("polygon")
    .attr("points", "0,8 8,0 8,4 4,8")
    .attr("fill", recipePalette.recipe1Ingredients);
stripes.append("polygon")
    .attr("points", "0,4 0,8 8,0 4,0")
    .attr("fill", recipePalette.recipe2Ingredients);
stripes.append("polygon")
    .attr("points", "4,8 8,8 8,4")
    .attr("fill", recipePalette.recipe2Ingredients);
stripes.append("polygon")
    .attr("points", `0,${4 - 2 * strokeScale} 0,${4 + 2 * strokeScale} ${4 + 2 * strokeScale},0 ${4 - 2 * strokeScale},0`)
    .attr("fill", "black");
stripes.append("polygon")
    .attr("points", `0,${8 - 2 * strokeScale} 0,8 ${2 * strokeScale},8 8,${2 * strokeScale} 8,0 ${8 - 2 * strokeScale},0`)
    .attr("fill", "black");
stripes.append("polygon")
    .attr("points", `${4 - 2 * strokeScale},8 ${4 + 2 * strokeScale},8 8,${4 + 2 * strokeScale} 8,${4 - 2 * strokeScale}`)
    .attr("fill", "black");
stripes.append("polygon")
    .attr("points", `0,0 0,${2 * strokeScale} ${2 * strokeScale},0`)
    .attr("fill", "black");
stripes.append("polygon")
    .attr("points", `8,8 8,${8 - 2 * strokeScale} ${8 - 2 * strokeScale},8`)
    .attr("fill", "black");

$("#networkx").ready(function(){
    drawSimulation("drinks");
});

function initializeDisplay({nodes, links}=stateProperties.lastDataset) {
    link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line");

    node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node");
        
    createNodeFeatures();
}

function initializeForces() {
    if (forceProperties.alpha.enabled) {
        simulation
            .force("collide", d3.forceCollide())
            .force("link", d3.forceLink())
            .force("center", d3.forceCenter())
            .force("forceX", d3.forceX())
            .force("forceY", d3.forceY());

        switch (forceProperties.charge.algorithm) {
            case("reuse"):
                simulation.force("charge", d3.forceManyBodyReuse());
                break;
            case("sampled"):
                simulation.force("charge", d3.forceManyBodySampled());
            default:
                simulation.force("charge", d3.forceManyBody());
                break;
        }

        updateForces();
    } else {
        simulation
            .force("collide", null)
            .force("charge", null)
            .force("link", null)
            .force("center", null)
            .force("forceX", null)
            .force("forceY", null);
    }
}

let drinksButton = d3.select("#svg-container")
    .append("div")
    .attr("class", "graph-button drinkButton")
    .attr("title", "Drink Map")
    .on("click", function (e, d) {
        drawSimulation("drinks");
        changeRecipeButtons("none");
        showRecipeButtons(true);
        hideTooltip();
    })
    .append("i")
    .attr("class", "fa fa-circle-nodes");

let ingredientsButton = d3.select("#svg-container")
    .append("div")
    .attr("class", "graph-button ingredientsButton")
    .attr("title", "Ingredient Tree")
    .on("click", function (e, d) {
        drawSimulation("tree", ingredients);
        changeRecipeButtons("none");
        showRecipeButtons(false);
        hideTooltip();
    })
    .append("i")
    .attr("class", "fa fa-share-nodes");

let singleRecipeButton = d3.select("#svg-container")
    .append("div")
    .attr("class", "graph-button singleRecipeButton")
    .attr("title", "Draw Single Recipe")
    .on("click", function (e, d) {
        changeRecipeButtons("singleRecipe", this);
        toggleDrag(false);
    })
    .append("i")
    .attr("class", "fa fa-martini-glass");

let doubleRecipeButton = d3.select("#svg-container")
    .append("div")
    .attr("class", "graph-button doubleRecipeButton")
    .attr("title", "Draw Recipe Overlap")
    .on("click", function (e, d) {
        changeRecipeButtons("doubleRecipe", this);
        toggleDrag(false);
        hideTooltip();
    })
    .append("i")
    .attr("class", "fa fa-champagne-glasses");

let tooltip = d3.select("#svg-container")
    .append("div")
    .attr("id", "tooltip")
    .attr("class", "hidden");

function changeRecipeButtons(current, button){
    toggleDrag(true);
    stateProperties.firstRecipeClicked = null;
    if(current !== "none"){
        const previousState = stateProperties.buttons[current];
        $.each(stateProperties.buttons, function (k, v) {
            stateProperties.buttons[k] = false;
            d3.select(`.${k}Button`).classed("active", false);
        });
        stateProperties.buttons[current] = !previousState;
        d3.select(button).classed("active", stateProperties.buttons[current]);
    }else{
        $.each(stateProperties.buttons, function (k, v) {
            stateProperties.buttons[k] = false;
            d3.select(`.${k}Button`).classed("active", false);
        });
    }
}

function tooltipSimilarity(){
    d3.select("#tooltip")
        .classed("hidden", false)
        .html(`<b>Similarity:</b> ${(stateProperties.lastSimilarity*100).toFixed(2)}%`);
}

function tooltipRecipe(e, d, t) {
    const recipe = drinks[d.id];

    let recipeDetails = "";
    recipeDetails += `<span class="recipe-title">${recipe.name}</span>`;
    recipeDetails += "<table>";
    recipe.ingredients.forEach(ingredient => {
    recipeDetails += "<tr>";
    recipeDetails += "<td class='measure'>";
        const amount = ingredient.amount_unit[0];
        const unit = ingredient.amount_unit[1];
        recipeDetails += `${amount} `;
        switch(unit){
            case "dash":
                if(amount !== 1){
                    recipeDetails += "dashes";
                }else{
                    recipeDetails += "dash";
                }
                break;
            case "oz":
                recipeDetails += "oz";
                break;
            case "splash":
                if (amount !== 1) {
                    recipeDetails += "splashes";
                } else {
                    recipeDetails += "splash";
                }
                break;
            case "drop":
                if (amount !== 1) {
                    recipeDetails += "drops";
                } else {
                    recipeDetails += "drop";
                }
                break;
        }
        recipeDetails += "</td>";
        recipeDetails += "<td class='ingredient'>";
        recipeDetails += `${ingredient.node.name}<br/>`;
        recipeDetails += "</td>";
        recipeDetails += "</tr>";
    });
    recipeDetails += "</table>";

    //Update the tooltip position and value
    d3.select("#tooltip")
        .html(recipeDetails);

    //Show the tooltip
    d3.select("#tooltip").classed("hidden", false);
}

function hideTooltip() {
    //Hide the tooltip
    d3.select("#tooltip").classed("hidden", true);
}

function showRecipeButtons(show) {
    //Hide the recipe buttons
    $.each(stateProperties.buttons, function (k, v) {
        stateProperties.buttons[k] = false;
        d3.select(`.${k}Button`).classed("hidden", !show);
    });
}

function createNodeFeatures({x, y} = stateProperties.lastClicked){
    node_dots = node.append("circle").attr("class", "node-dots");
    //Cannot use shorthand to access 'this'
    node_dots.on("click", function (e, d) {
        console.log(d);
        switch (stateProperties.currentType) {
            case "drinks":
                if (stateProperties.buttons.singleRecipe) {
                    drawSimulation("recipe", d.id);
                    changeRecipeButtons("none");
                    showRecipeButtons(false);
                } else if (stateProperties.buttons.doubleRecipe) {
                    if (!stateProperties.firstRecipeClicked) {
                        stateProperties.firstRecipeClicked = d.id;
                        d3.select(this).attr("fill", "#da4310");
                    } else {
                        drawSimulation("recipe", stateProperties.firstRecipeClicked, d.id);
                        changeRecipeButtons("none");
                        showRecipeButtons(false);
                        tooltipSimilarity();
                    }
                }
            break;
            case "tree":
                freezeNodes();
                addIngredientEdges(ingredientDict[d.id]);
                setTimeout(unFreezeNodes, 80);
            break;
        }
    });
    if (stateProperties.currentType === "drinks"){
    node_dots.on("mouseover", function (e, d) {
        switch (stateProperties.currentType) {
            case "drinks":
                if (!stateProperties.buttons.doubleRecipe) {
                    tooltipRecipe(e, d, this);
                }
            break;
        }
    });
    }


    if (stateProperties.currentType !== "drinks"){
        node_titles = node.append("title")
            .text(d => d.id);
    }

    node_text = node.append("text")
        .attr("class", "node-text")
        .attr("dx", displayProperties.node.x_offset)
        .attr("dy", displayProperties.node.y_offset)
        .text(d => { 
            if(d.type === "drinks"){
                return drinks[d.id].name;
            }else{
                return d.id;
            }
        })
        .style("text-anchor", displayProperties.node.justify)
        .style("alignment-baseline", "central");

    if (displayProperties.graph.isDirected){
        link.attr("marker-end", "url(#halfarrowhead)")
            .attr("fill", "black")
            .attr("stroke", "black");
    }
}

function removeNodeFetaures(){
    node_dots.transition().attr("r", 0).remove();
    node_text.remove();
    if(node_titles){
        node_titles.remove();
    }
}

function freezeNodes(){
    const selNodes = d3.selectAll(".node");
    selNodes.each(d => {
        d.fx = d.x;
        d.fy = d.y;
    });
}

function unFreezeNodes() {
    const selNodes = d3.selectAll(".node");
    selNodes.each(d => {
        d.fx = null;
        d.fy = null;
    });
}

function startSimulation(time = stateProperties.transition, {nodes} = stateProperties.lastDataset) {
    simulation.nodes(nodes);
    initializeDisplay();
    simulation.on("tick", ticked);
    initializeForces();
    draghandler(node);
    zoom(svg);
    updateDisplay(time);
}

function updateSimulation({ nodes, links } = stateProperties.lastDataset) {
    // Updates the node & link data after nodes & links update
    node = node.data(nodes, d => d.id);
    link = link.data(links, d => d.source.id + "-" + d.target.id);

    // Select all nodes & links that need removal
    // after data update mismatch with DOM
    node.exit().transition().remove();
    link.exit().remove();

    node = node.enter()
        .append("g")
        .attr("class", "node")
        .merge(node);

    link = link.enter()
        .append("line")
        .merge(link);

    removeNodeFetaures();
    createNodeFeatures();
    draghandler(node);

    simulation.nodes(nodes)
    simulation.alpha(forceProperties.alpha.restart).restart();
}

// update the display based on the forces (but not positions)
function updateDisplay(time = stateProperties.transition) {
    const t = d3.transition()
        .duration(time)
        .ease(d3.easeLinear);

    let lineColor = "none";
    if (displayProperties.edge.width > 0){
        switch(stateProperties.currentType){
            case "drinks":
                lineColor = "purple";
                break;
            default:
                lineColor = "black";
                break
        }
    }
    node_dots.transition(t)
        .attr("r", displayProperties.node.radius)
        .attr("stroke", "black");

    link.transition(t)
        .attr("stroke-width", displayProperties.edge.width)
        .attr("opacity", d => {
            if (d.type === "drinks") {
                const score = avg_score(d.source.id, d.target.id);
                return scoreToWeight(score) * forceProperties.link.enabled;
            }else{
                return forceProperties.link.enabled;
            }
        })
        .attr("stroke", lineColor);

    d3.select("#halfarrowhead")
        .attr("viewBox", [-displayProperties.marker.height, -displayProperties.marker.width, displayProperties.marker.height, displayProperties.marker.width])
        .attr('refX', displayProperties.node.radius)
        .attr('refY', displayProperties.edge.width / 2)
        .attr("fill", lineColor);

    node_text
        .style("font-size", displayProperties.node.text_size)
        .attr("dx", displayProperties.node.x_offset)
        .attr("dy", displayProperties.node.y_offset)
        .style("text-anchor", displayProperties.node.justify);
    
    if (stateProperties.currentType === "recipe"){
        highlightRecipes();
    }else{
        node_dots.attr("fill", d => {
            if (d.type === "drinks" || d.type === "tree") {
                return "grey";
            }
        });
    }

}

function updateForces(links = stateProperties.lastDataset.links) {
    if (forceProperties.alpha.enabled) {
        simulation.force("center")
            .x(width * forceProperties.center.x)
            .y(height * forceProperties.center.y);
        simulation.force("charge")
            .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
            .distanceMin(forceProperties.charge.distanceMin)
            .distanceMax(forceProperties.charge.distanceMax);
        simulation.force("collide")
            .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
            .radius(forceProperties.collide.relativeRadius * displayProperties.node.radius)
            .iterations(forceProperties.collide.iterations);
        simulation.force("forceX")
            .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
            .x(width * forceProperties.forceX.x);
        simulation.force("forceY")
            .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
            .y(height * forceProperties.forceY.y);
        simulation.force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(forceProperties.link.distance)
            .iterations(forceProperties.link.iterations)
            .strength(d => {
                if (d.type === "drinks") {
                    const score = avg_score(d.source.id, d.target.id);
                    return scoreToWeight(score) * forceProperties.link.enabled;
                } else {
                    return forceProperties.link.strength * forceProperties.link.enabled;
                }
            }));

        simulation.alpha(forceProperties.alpha.restart)
            .restart();
    }
}

// update the display positions after each simulation tick
function ticked() {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    d3.select('#alpha-value')
        .style('flex-basis', (simulation.alpha() * 100) + '%');
}

function dragstarted(e, d) {
    if (!e.active) {
        simulation.alpha(0.25);
        simulation.alphaTarget(forceProperties.alpha.targetHigh)
            .restart();
    }
    d.fx = e.x;//prevents node from floating off
    d.fy = e.y;
}

function dragged(e, d) {
    d.fx = e.x;//node moves with mouse
    d.fy = e.y;
}

function dragended(e, d) {
    if (!e.active) {
        simulation.alphaTarget(forceProperties.alpha.targetLow);//Tells it to eventually stop moving
    }
    d.fx = null;//f stands for fixed
    d.fy = null;//Setting to null allows caluclated positions to resume
}

const draghandler = d3.drag()
    .on("start", dragstarted)//Pause node calculations
    .on("drag", dragged)//Move the node
    .on("end", dragended);//Resume node calculations

function toggleDrag(enabled) {
    if (!enabled) {
        node.on('.drag', null);  // Disable drag
    } else {
        node.call(draghandler);  // Enable drag
    }
    stateProperties.dragEnabled = enabled;
}

const zoom = d3.zoom()
    .on('zoom', zoomhandler);

function zoomhandler(e) {
    g.attr('transform', e.transform);
}

d3.select(window)
    .on("resize", function () {
        width = +svg.node()
            .getBoundingClientRect()
            .width;
        height = +svg.node()
            .getBoundingClientRect()
            .height;
        updateForces();
        //updateLegend();
    });

function updateAll(time = stateProperties.transition) {
    updateForces();
    updateDisplay(time);
}

function updateLegend() {
    legend_text.attr("x", $(".networkx").width() - displayProperties.legend.padding_right - displayProperties.legend.text_gap)
        .attr("y", (d, i) => parseInt(displayProperties.legend.padding_top) + i * displayProperties.legend.line_spacing)
        .style("font-size", displayProperties.legend.text_size);
    legend_dots.attr("cx", $(".networkx").width() - displayProperties.legend.padding_right)
        .attr("cy", (d, i) => parseInt(displayProperties.legend.padding_top) + i * displayProperties.legend.line_spacing)
        .attr("r", 0.6 * d3.select(".legend-text").node().getBBox().height / 2);
}