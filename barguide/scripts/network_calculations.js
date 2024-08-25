//////////MISC//////////
const average = array => array.reduce((a, b) => a + b) / array.length;

function getNamesFromKeys(keys, dictionary, defaultValue = null) {//Unused
    return keys.map(key => dictionary.hasOwnProperty(key) ? dictionary[key].name : defaultValue);
}


//////////SCORES//////////
function find_similar(recipe_name){
	let scores = [];
	let scored_drinks = [];
	$.each(drinks, function(k, v){
		if(recipe_name !== k){
			scores.push(avg_score(recipe_name, k));
			scored_drinks.push(k);
		}
	});
	const pairs = scored_drinks.map((scored_drinks, index) => [scored_drinks, scores[index]]);
	pairs.sort((a, b) => b[1] - a[1]);
	const sorted_recipe_names = pairs.map(pair => pair[0]);
	const sorted_scores = pairs.map(pair => pair[1]);
	return {recipes: sorted_recipe_names, scores: sorted_scores}
}

function score_all(output=false){
	$.each(drinks, function(k1, v1){
		$.each(drinks, function(k2, v2){
			console.log(`${v1.name}, ${v2.name}`);
			console.log({k1k2: score_similarity(k1, k2, output).toFixed(4), 
						 k2k1: score_similarity(k2, k1, output).toFixed(4), 
						 avg: average([score_similarity(k1, k2, output), 
							  score_similarity(k2, k1, output)]).toFixed(4)
						});
		});
	});
}

function avg_score(recipe_name1 = stateProperties.lastRecipe1, recipe_name2 = stateProperties.lastRecipe2, output=false){
	const score1 = score_similarity(recipe_name1, recipe_name2, output);
	const score2 = score_similarity(recipe_name2, recipe_name1, output);
	return average([score1, score2]);
}

function score_similarity(recipe_name1, recipe_name2, output=false){
	if(output){
		console.log(`Scoring Technique: <${drinks[recipe_name1].name}> vs <${drinks[recipe_name2].name}>`);
	}
	let scores = [];
	$.each(recipe_ingredients_node(recipe_name1), function(key1, value1){
		if(!(value1 instanceof Garnish || value1 instanceof Bitters)){
			let ingredient_score = [];
			let cons = [];
			$.each(recipe_ingredients_node(recipe_name2), function(key2, value2){
				if(!(value2 instanceof Garnish || value2 instanceof Bitters)){
					const lineage1 = value1.getLineage();
					const lineage2 = value2.getLineage();
					const matches = lineage1.filter(element => lineage2.includes(element));
					let score;
					if(value1 === value2){
						score = 1;
					}else{
						score = 1 - Math.pow(0.5 , matches.length - 1);
					}
					ingredient_score.push(score);
					cons.push([value1.name, value2.name, matches, score]);
				}
			});
			const max = Math.max(...ingredient_score)
			scores.push(max);
			const i = ingredient_score.indexOf(max);
			if(output){
				console.log(cons[i]);
			}
		}
	});
	return average(scores);
}

function scoreToWeight(score){
	const P = 0.5;//Value at center point
	const H = 0.7;//Center point
	const K = 1;//Max
	const td = 0.03;//Time to double
	const R = Math.log(2)/td;//Growth Rate

	return (P*K*Math.exp(R*(score - H)))/(K - P + P*Math.exp(R*(score - H)));
}

//////////ABV//////////
function recipe_abv(recipe_name){
	let alcohol_vol = 0;
	let total_vol = 0;
	$.each(drinks[recipe_name].ingredients, function(k, v){
		if(typeof v.node.ABV !== "undefined"){
			const vol_oz = convert_volume(v.amount_unit, "oz");
			total_vol += vol_oz;
			const abv = v.node.ABV;
			alcohol_vol += vol_oz*abv;
			console.log(`${v.node.name}: ${alcohol_vol}`);
			console.log(v);
		}
	});
	return alcohol_vol/total_vol;
}

function list_abv(recipe_names){
	$.each(recipe_names, function(k, v){
		console.log(`${drinks[v].name}: ${(recipe_abv(v)*100).toFixed(1)}% (ABV)`);
	});
}

function ingredientsMatch(recipeName, selectedIngredientArr, matchNumber, eq){// eq = lt, gt, lte, gte
	// Example: ingredientsMatch("recipe_1", [tequila, lime], 1, "gte")

}