let drinks = {
	recipe_1: {
		id: "recipe_1",
		name: "The Pink Rabbit",
		color: "pink",
		source: "M'tucci's",
		ingredients: [
			{
				node: absolut_apeach_vodka,
				amount_unit: [2, "oz"]
			},
			{
				node: stgermain,
				amount_unit: [1, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: strawberry,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_2: {
		id: "recipe_2",
		name: "High Fashion",
		color: "pink",
		source: "Nick",
		ingredients: [
			{
				node: gin,
				amount_unit: [1.5, "oz"]
			},
			{
				node: drillaud_elderflower,
				amount_unit: [1, "oz"]
			},
			{
				node: langers_grapefruit_juice,
				amount_unit: [1, "oz"]
			},
			{
				node: soda,
				amount_unit: [1, "splash"]
			}
		]
	},
	recipe_3: {
		id: "recipe_3",
		name: "Too Fucking Good Margarita",
		color: "yellow",
		source: "Nick",
		ingredients: [
			{
				node: tresamigos_reposado,
				amount_unit: [1.5, "oz"]
			},
			{
				node: royale_orange,
				amount_unit: [1.5, "oz"]
			},
			{
				node: lime_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: thin_simple,
				amount_unit: [0.5, "oz"]
			},
			{
				node: salt_rim,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_4: {
		id: "recipe_4",
		name: "New Mexican Old Fashioned #1",
		color: "brown",
		source: "Nick",
		ingredients: [
			{
				node: tequila_reposado,
				amount_unit: [1.5, "oz"]
			},
			{
				node: ancho_reyes,
				amount_unit: [0.75, "oz"]
			},
			{
				node: fee_orange,
				amount_unit: [1, "dash"]
			}
		]
	},
	recipe_5: {
		id: "recipe_5",
		name: "New Mexican Old Fashoned #2",
		color: "yellow",
		source: "Nick",
		ingredients: [
			{
				node: tequila_reposado,
				amount_unit: [1.5, "oz"]
			},
			{
				node: stelizabeth,
				amount_unit: [0.25, "oz"]
			},
			{
				node: royale_orange,
				amount_unit: [0.25, "oz"]
			},
			{
				node: luxardo_cherry,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_6: {
		id: "recipe_6",
		name: "The Prickly Pear",
		color: "brown",
		source: "Nick",
		ingredients: [
			{
				node: tequila_reposado,
				amount_unit: [1.5, "oz"]
			},
			{
				node: gingerbeer,
				amount_unit: [2.0, "oz"]
			},
			{
				node: pricklypear_505,
				amount_unit: [0.5, "oz"]
			},
			{
				node: tajin_rim,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_7: {
		id: "recipe_7",
		name: "Nick's Mojito",
		color: "colorless",
		source: "Nick",
		ingredients: [
			{
				node: white_rum,
				amount_unit: [2, "oz"]
			},
			{
				node: rich_simple,
				amount_unit: [1, "oz"]
			},
			{
				node: lime,
				amount_unit: [1, "count"]
			},
			{
				node: mint,
				amount_unit: [1, "count"]
			},
			{
				node: soda,
				amount_unit: [4, "oz"]
			}
		]
	},
	recipe_8: {
		id: "recipe_8",
		name: "Bird Shoes",
		color: "brown",
		source: "701 Craft",
		ingredients: [
			{
				node: plymouth,
				amount_unit: [2, "oz"]
			},
			{
				node: earl_grey_syrup,
				amount_unit: [0.75, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: alchemist_orgeat,
				amount_unit: [0.5, "oz"]
			},
			{
				node: fee_cardamom,
				amount_unit: [4, "dash"]
			},
			{
				node: lemon_peel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_9: {
		id: "recipe_9",
		name: "Floral Bliss",
		color: "purple",
		source: "Nick",
		ingredients: [
			{
				node: empress_purple,
				amount_unit: [2, "oz"]
			},
			{
				node: luxardo_maraschino,
				amount_unit: [0.75, "oz"]
			},
			{
				node: rothman_violette,
				amount_unit: [0.5, "oz"]
			},
			{
				node: drillaud_elderflower,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: luxardo_cherry,
				amount_unit: [1, "count"]
			},
			{
				node: lemon_peel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_10: {
		id: "recipe_10",
		name: "The Saturn",
		color: "red",
		source: "Nick",
		ingredients: [
			{
				node: empress_red,
				amount_unit: [1.5, "oz"]
			},
			{
				node: falernum,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: alchemist_passionfruit,
				amount_unit: [0.5, "oz"]
			},
			{
				node: alchemist_orgeat,
				amount_unit: [0.5, "oz"]
			},
			{
				node: luxardo_cherry,
				amount_unit: [1, "count"]
			},
			{
				node: lime_peel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_11: {
		id: "recipe_11",
		name: "Nick's Word",
		color: "yellow",
		source: "Nick",
		ingredients: [
			{
				node: hendricks,
				amount_unit: [2, "oz"]
			},
			{
				node: benedictine,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: luxardo_maraschino,
				amount_unit: [0.25, "oz"]
			}
		]
	},
	recipe_12: {
		id: "recipe_12",
		name: "Aviation",
		color: "purple",
		source: "Nick",
		ingredients: [
			{
				node: empress_purple,
				amount_unit: [2, "oz"]
			},
			{
				node: rothman_violette,
				amount_unit: [0.5, "oz"]
			},
			{
				node: luxardo_maraschino,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: luxardo_cherry,
				amount_unit: [1, "count"]
			},
			{
				node: lemon_peel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_13: {
		id: "recipe_13",
		name: "The Bee's Knees",
		color: "yellow",
		source: "Nick",
		ingredients: [
			{
				node: lee_lavender,
				amount_unit: [2, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: honey,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lemon_peel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_14: {
		id: "recipe_14",
		name: "Ectoplasm 1.0",
		color: "green",
		source: "Nick",
		ingredients: [
			{
				node: midori,
				amount_unit: [1.5, "oz"]
			},
			{
				node: stacks_peach,
				amount_unit: [1.5, "oz"]
			}
		]
	},
	recipe_15: {
		id: "recipe_15",
		name: "Ectoplasm 2.0",
		color: "blue",
		source: "Nick",
		ingredients: [
			{
				node: hpnotiq,
				amount_unit: [2, "oz"]
			},
			{
				node: vodka,
				amount_unit: [1, "oz"]
			},
			{
				node: lemon_juice,
				amount_unit: [1, "dash"]
			}
		]
	},
	recipe_16: {
		id: "recipe_16",
		name: "Lion's Tail",
		color: "brown",
		source: "Nick",
		ingredients: [
			{
				node: bourbon,
				amount_unit: [2, "oz"]
			},
			{
				node: stelizabeth,
				amount_unit: [0.5, "oz"]
			},
			{
				node: lime_juice,
				amount_unit: [0.5, "oz"]
			},
			{
				node: rich_simple,
				amount_unit: [0.25, "oz"]
			},
			{
				node: old_fashion,
				amount_unit: [2, "dash"]
			},
			{
				node: lime_wheel,
				amount_unit: [1, "count"]
			}
		]
	},
	recipe_17: {
		id: "recipe_17",
		name: "Libertine Cafe",
		color: "brown",
		source: "Uncle Pete's Cocktail Shop",
		ingredients: [
			{
				node: cognac,
				amount_unit: [0.75, "oz"]
			},
			{
				node: scotch_whisky,
				amount_unit: [0.75, "oz"]
			},
			{
				node: banana_liqueur,
				amount_unit: [0.5, "oz"]
			},
			{
				node: cold_brew_extract,
				amount_unit: [0.25, "oz"]
			}
		]
	},
	recipe_18: {
		id: "recipe_18",
		name: "The Final Say",
		color: "Unknown",
		source: "Mike Janowski",
		ingredients: [
			{
				node: gin,
				amount_unit: [0.75, "oz"]
			},
			{
				node: luxardo_maraschino,
				amount_unit: [1, "oz"]
			},
			{
				node: stgermain,
				amount_unit: [0.375, "oz"]
			},
			{
				node: benedictine,
				amount_unit: [0.375, "oz"]
			},
			{
				node: absinthe,
				amount_unit: [4, "drop"]
			},
			{
				node: lime_juice,
				amount_unit: [0.75, "oz"]
			}
		]
	},
	recipe_19: {
		id: "recipe_19",
		name: "Kentucky Colonel",
		color: "Brown",
		source: "Anders Erickson",
		ingredients: [
			{
				node: bourbon,
				amount_unit: [2, "oz"]
			},
			{
				node: benedictine,
				amount_unit: [0.5, "oz"]
			},
			{
				node: old_fashion,
				amount_unit: [2, "dash"]
			},
			{
				node: lemon_peel,
				amount_unit: [1, "unit"]
			}
		]
	}
};