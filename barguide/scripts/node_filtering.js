function updateObject(newData, oldData) {
    newData.forEach((d1, i1) => {
        oldData.forEach((d2, i2) => {
            if (d1.id === d2.id) {
                newData[i1] = oldData[i2];
            }
        });
    });
    return newData;
}

function createGraph(type, ref, ref2){
    let graph;
    switch(type){
        case "tree": 
            graph = graphIngredients(ref);
            break;
        case "recipe":
            graph = graphRecipe(ref, ref2);
            break;
        case "drinks":
            graph = graphDrinks();
            break;
    }

    return graph;
}

function graphIngredients(ingredient){
	let graph = new jsnx.DiGraph();
    graph.addEdgesFrom(ingredient.getNextEdgelist(true));

    return graph;
}

function graphRecipe(recipeName1, recipeName2) {
    let graph = new jsnx.DiGraph();
    graph.addEdgesFrom(recipe_edges(recipeName1));
    graph.removeNode("Ingredients");
    if(recipeName2){
        graph.addEdgesFrom(recipe_edges(recipeName2));
        graph.removeNode("Ingredients");
        graph = removeIsolated(recipeName1, recipeName2, graph);
        graph = removeTails(recipeName1, recipeName2, graph);
    }

    return graph;
}

function graphDrinks(){
    let graph = new jsnx.Graph();
    let pairs = [];
    $.each(drinks, function (drink1) {
        $.each(drinks, function (drink2) {
            if (drink1 !== drink2 && !pairs.some(item => [drink1, drink2].every(subitem => item.includes(subitem)))) {//this ensures only one edge between nodes
                pairs.push([drink1, drink2]);
            }
        });
    });
    graph.addEdgesFrom(pairs);
    
    return graph;
}

function updateSimulationRoutine(time = stateProperties.transition){
    updateSimulation();
    updateForces();
    switch (stateProperties.currentType) {
        case "recipe":
            if (stateProperties.lastRecipe1 !== stateProperties.lastRecipe2 && stateProperties.lastRecipe2 !== null) {
                stateProperties.lastSimilarity = avg_score(stateProperties.lastRecipe1, stateProperties.lastRecipe2);
                console.log(`Similarity Score: ${stateProperties.lastSimilarity}`);
            }
            break;
    }
    updateDisplay(time);
}

function drawSimulation(type, ref, ref2 = null) {
    let oldType = null;
    if(stateProperties.currentType){
        oldType = stateProperties.currentType;
    }
    stateProperties.currentType = type;
    const initial = stateProperties.lastDataset === null;
    stateProperties.lastGraph = createGraph(type, ref, ref2);
    if(type === "recipe"){
        stateProperties.lastRecipe1 = ref;
        stateProperties.lastRecipe2 = ref2;
    }
    jsnx.isDirected(stateProperties.lastGraph) ? displayProperties.graph.isDirected = true : displayProperties.graph.isDirected = false;
    let oldNodes = null;
    if (stateProperties.lastDataset){
        oldNodes = stateProperties.lastDataset.nodes;
    }
    stateProperties.lastDataset = convertGraphToSimulation();
    if (oldType === stateProperties.currentType){
        updateObject(stateProperties.lastDataset.nodes, oldNodes);
    }
    if(!initial){
        updateSimulationRoutine();
    }else{
        startSimulation();
    }
}

function convertGraphToSimulation(graph = stateProperties.lastGraph, type = stateProperties.currentType) {
    const dataset = {};
    dataset.nodes = {};
    dataset.links = [];
    graph.edges().forEach(edge => {
        if (!dataset.nodes[edge[0]]) {
            dataset.nodes[edge[0]] = {
                id: edge[0],
                type: type
            };
        }
        if (!dataset.nodes[edge[1]]) {
            dataset.nodes[edge[1]] = {
                id: edge[1],
                type: type
            };
        }
        dataset.links.push({
            source: edge[0], 
            target: edge[1],
            type: type
        });
    });
    dataset.nodes = Object.values(dataset.nodes);

    return dataset;
}