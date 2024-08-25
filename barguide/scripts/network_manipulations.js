function highlightRecipes(graph = stateProperties.lastGraph, recipe_name1 = stateProperties.lastRecipe1, recipe_name2 = stateProperties.lastRecipe2) {
    const recipe1 = recipe_ingredients(recipe_name1);
    let rn2 = recipe_name2;
    if (typeof recipe_name2 === "undefined" || recipe_name2 === null) {
        rn2 = recipe_name1;
    }
    recipe_name2 = rn2;
    const recipe2 = recipe_ingredients(recipe_name2);
    recipe_name1 = drinks[recipe_name1].name;
    recipe_name2 = drinks[recipe_name2].name;
    node_dots.attrs(d => {
        let fill = "grey", stroke = "black", strokeWidth = "1px";
        if (graph.outDegree(d.id) >= 2 && !recipe1.includes(d.id) && !recipe2.includes(d.id) && jsnx.hasPath(graph, { source: d.id, target: recipe_name1 }) && jsnx.hasPath(graph, { source: d.id, target: recipe_name2 })) {
            fill = recipePalette.top;
        } else if (d.id === recipe_name1) {
            fill = recipePalette.recipe1;
        } else if (d.id === recipe_name2) {
            fill = recipePalette.recipe2;
        } else if (recipe2.includes(d.id) && recipe1.includes(d.id) && JSON.stringify(recipe1) !== JSON.stringify(recipe2)) {
            d.common = true;
            fill = "url(#recipeStripes)";
        } else {
            if (recipe1.includes(d.id)) {
                fill = recipePalette.recipe1Ingredients;
            } else if (recipe2.includes(d.id)) {
                fill = recipePalette.recipe2Ingredients;
            }
        }
        return {
            fill: fill,
            stroke: stroke,
            "stroke-width": strokeWidth
        };
    });
}

function removeIsolated(recipeName1, recipeName2, graph) {
    const node_count = graph.nodes().length;
    const UG1 = undirected(graph);
    const UG2 = undirected(graph);
    UG1.removeNode(drinks[recipeName1].name);
    UG2.removeNode(drinks[recipeName2].name);
    graph.nodes().forEach(d => {
        if (graph.outDegree(d) > 1) {
            if (!jsnx.hasPath(UG2, { source: d, target: drinks[recipeName1].name }) || !jsnx.hasPath(UG1, { source: d, target: drinks[recipeName2].name })) {
                graph.removeNode(d);
            }
        }
    });
    if (graph.nodes().length !== node_count) {
        removeIsolated(recipeName1, recipeName2, graph);
    }

    return graph;
}

function removeTails(recipe_name1, recipe_name2, graph) {
    const node_count = graph.nodes().length;
    const UG = undirected(graph);
    const recipes = [drinks[recipe_name1].name, drinks[recipe_name2].name];
    UG.nodes().forEach(d => {
        if ((UG.neighbors(d).length == 1 && !recipes.includes(UG.neighbors(d)[0])) || UG.neighbors(d).length == 0) {
            graph.removeNode(d);
        }
    });
    if (graph.nodes().length !== node_count) {
        removeTails(recipe_name1, recipe_name2, graph);
    }

    return graph;
}

function undirected(directed_graph) {
    const undirected_graph = new jsnx.Graph();
    directed_graph.nodes().forEach(d => {
        undirected_graph.addNode(d);
    });
    directed_graph.edges().forEach(d => {
        undirected_graph.addEdge(d[0], d[1]);
    });
    return undirected_graph;
}

function recipe_ingredients(recipe_name) {
    let list = [];
    drinks[recipe_name].ingredients.forEach(d => {
        list.push(d.node.name);
    });
    return list;
}

function recipe_ingredients_node(recipe_name) {
    let list = [];
    drinks[recipe_name].ingredients.forEach(d => {
        list.push(d.node);
    });
    return list;
}

function recipe_edges(recipe_name) {
    const ingredientArray = recipe_ingredients_node(recipe_name);
    const edgeList = [];

    $.each(ingredientArray, function (index, node) {
        if (!(node instanceof Garnish)) {
            const lineage = node.getLineage();
            for (let i = 0; i < lineage.length - 1; i++) {
                edgeList.push([lineage[i].name, lineage[i + 1].name]);
            }
            edgeList.push([node.name, drinks[recipe_name].name]);
        }
    });

    return edgeList;
}

function addIngredientEdges(ingredient, graph = stateProperties.lastGraph){
    if(ingredient.children.length > 0){
        let hasSource = false;
        const edges = graph.edges();
        edges.every(edge => {
            if(edge[0] === ingredient.name){
                hasSource = true;
                return false;
            }
            return true;
        });
        if (!hasSource) {
            const addEdges = ingredient.getNextEdgelist();
            graph.addEdgesFrom(addEdges);
        } else {
            const removeEdges = ingredient.getFullEdgelist();
            graph.removeEdgesFrom(removeEdges);
        }
        const sim = convertGraphToSimulation(graph);
        stateProperties.lastGraph = graph;
        const oldNodes = stateProperties.lastDataset.nodes;
        stateProperties.lastDataset = sim;
        stateProperties.lastDataset.nodes = updateObject(stateProperties.lastDataset.nodes, oldNodes);
        updateSimulationRoutine(30);
    }
}