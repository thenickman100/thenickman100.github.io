function distance(node1, node2){
	const lineage1 = node1.getLineage();
	const lineage2 = node2.getLineage();
	const lineage2_unique = lineage2.filter(element => !(new Set(lineage1)).has(element));
	const lineage1_unique = lineage1.filter(element => !(new Set(lineage2)).has(element));
	const dist = lineage1_unique.length + lineage2_unique.length;
	return dist;
}

function assignCostOzGuess(ingredient) {
    // Function to calculate median
    const calculateMedian = (values) => {
        if (values.length === 0) return null; // Return null if no values are present

        let sorted = values.filter(value => typeof value === 'number').sort((a, b) => a - b); // Filter and sort numeric values
        let medianIdx = Math.floor(sorted.length / 2);
        let medianValue = (sorted.length % 2 === 1) 
            ? sorted[medianIdx] 
            : (sorted[medianIdx - 1] + sorted[medianIdx]) / 2;

        return medianValue.toFixed(2); // Return median with two decimal places
    };

    // Helper function to recursively collect all descendant ingredients
    const collectAllDescendants = (ingredient) => {
        let descendants = [];
        ingredient.children.forEach((child) => {
            descendants.push(child);
            descendants = descendants.concat(collectAllDescendants(child));
        });
        return descendants;
    };

    // Collect all descendant children
    let allChildren = collectAllDescendants(ingredient);

    // Filter descendant children with defined and numeric cost_oz values
    let childCosts = allChildren
        .filter(child => typeof child.cost_oz === 'number') // Filter for numeric cost_oz
        .map(child => child.cost_oz);

    // Calculate median cost_oz
    let medianCostOz = calculateMedian(childCosts);

    if (medianCostOz !== null) {
        // Assign cost_oz_guess to ingredient if it doesn't have cost_oz defined
        if (typeof ingredient.cost_oz !== 'number') {
            ingredient.cost_oz_guess = parseFloat(medianCostOz); // Convert medianCostOz back to number if needed
        }
    }
}



function convert_volume([input_volume, input_unit], output_unit){
	//convert to mL first.
    const mL_to = {
		'drop': 20,
        'oz': 1/29.57,
        'dash': 1.62,
        'L': 1/1000,
        'cup': 1/236.59,
        'barspoon': 1/5,
		"mL": 1,
		"splash": 1/14.79
    };
	
	return input_volume/mL_to[input_unit]*mL_to[output_unit];

}

const ingredientDict = {};

class Ingredient{
    constructor(name, parent_=null){
		this.name = name;
        this.children = [];
        this.parent_ = parent_;
		if(this.parent_){
			this.setParent(parent_)
		}
		ingredientDict[this.name] = this;
    }
	
    setParent(parent_){
        this.parent_ = parent_;
        parent_.children.push(this);
    }

    getLineage(){
        let lineage = [];
        let current = this;
        while(current){
            lineage.unshift(current);
            current = current.parent_;
        }
        return lineage;
    }
	/*
    getLineage_names(){
        let lineage = [];
        let current = this;
        while(current){
            lineage.unshift(current.name);
            current = current.parent_;
        }
        return lineage;
    }*/
	
	getFullEdgelist() {
		let edges = [];
		// Helper function to recursively collect edges
		const collect_edges = (ingredient) => {
			for (let child of ingredient.children) {
				edges.push([ingredient.name, child.name]);
				collect_edges(child);
			}
		};

		collect_edges(this);
		return edges;
	}

	getNextEdgelist() {
		let edges = [];
		for (let child of this.children) {
			edges.push([this.name, child.name]);
		}

		return edges;
	}
	
	/*get_layered_edgelists() {
		let layers = [];
		let currentLevel = [this];

		while (currentLevel.length > 0) {
			let nextLevel = [];
			let edges = [];

			currentLevel.forEach(node => {
				node.children.forEach(child => {
					edges.push([node.name, child.name]);
					nextLevel.push(child);
				});
			});

			layers.push(edges);
			currentLevel = nextLevel;
		}
		
		return layers;
	}*/
	getDescendants() {
		/*Not used Yet*/
        let descendants = [];
        const collect_descendants = (ingredient) => {
            for (let child of ingredient.children) {
                descendants.push(child);
                collect_descendants(child);
            }
        };
        collect_descendants(this);
        return descendants;
    }
}

class Bottle extends Ingredient{
	constructor(name, parent_, {ABV=0, unit_cost, unit_volume, brand} = {}){
		super(name, parent_);
		this.ABV = ABV;
		if(typeof unit_cost !== "undefined" && typeof unit_volume !== "undefined"){
			this.cost_oz = unit_cost/convert_volume(unit_volume, "oz");
		}
	}
}
class Liquor extends Bottle{
	constructor(name, parent_, {ABV=0.40, unit_cost, unit_volume, brand} = {}){
		super(name, parent_, {ABV, unit_cost, unit_volume, brand});
	}
}
class AperitifDigestif extends Bottle{
	constructor(name, parent_, {ABV=0.30, unit_cost, unit_volume, brand} = {}){
		super(name, parent_, {ABV, unit_cost, unit_volume, brand});
	}
}
class Liqueur extends Bottle{
	constructor(name, parent_, {ABV=0.20, unit_cost, unit_volume, brand} = {}){
		super(name, parent_, {ABV, unit_cost, unit_volume, brand});
	}
}
class Syrup extends Bottle{
	constructor(name, parent_, {ABV=0, unit_cost, unit_volume, brand} = {}){
		super(name, parent_, {ABV, unit_cost, unit_volume, brand});
	}
}
class Bitters extends Bottle{
	constructor(name, parent_, {ABV=0.40, unit_cost, unit_volume, brand} = {}){
		super(name, parent_, {ABV, unit_cost, unit_volume, brand});
	}
}
class Juice extends Ingredient{
	constructor(name, parent_, {ABV=0, unit_cost, unit_count, volume_per_count, brand} = {}){
		super(name, parent_);
		this.ABV = ABV;
		if(typeof unit_cost !== "undefined" && typeof unit_count !== "undefined" && typeof volume_per_count !== "undefined"){
			this.cost_oz = unit_cost/unit_count/convert_volume(volume_per_count, "oz");
		}
	}
}
class Fruit extends Ingredient{
	constructor(name, parent_, {unit_cost, unit_count} = {}){
		super(name, parent_);
		if(typeof unit_cost !== "undefined" && typeof unit_count !== "undefined"){
			this.cost_count = unit_cost/unit_count;
		}
	}
}
class Garnish extends Ingredient{
	constructor(name, parent_, {unit_cost, unit_count} = {}){
		super(name, parent_);
		if(typeof unit_cost !== "undefined" && typeof unit_count !== "undefined"){
			this.cost_count = unit_cost/unit_count;
		}
	}
}

const ingredients = new Ingredient("Ingredients");

const liquor = new Liquor("Liquor", ingredients);

const vodka = new Liquor("Vodka", liquor);
const amsterdam_vodka = new Liquor("New Amsterdam Vodka", vodka, {
	ABV: 0.40,
	brand: "New Amsterdam",
	unit_cost: 18.99,
	unit_volume: [1.75, "L"]
});
const chopin_vodka = new Liquor("Chopin Vodka", vodka, {
	ABV: 0.40,
	brand: "Chopin",
	unit_cost: 24.99,
	unit_volume: [750, "mL"]
});
const absolut_vodka = new Liquor("Absolut Vodka", vodka, {
	ABV: 0.40,
	brand: "Absolut",
	unit_cost: 15.99,
	unit_volume: [750, "mL"]
});
const flavored_vodka = new Liquor("Flavored Vodka", vodka);
const absolut_apeach_vodka = new Liquor("Absolut Apeach Vodka", flavored_vodka, {
	ABV: 0.40,
	brand: "Absolut",
	unit_cost: 17.99,
	unit_volume: [750, "mL"]
});

const gin = new Liquor("Gin", liquor);
const plymouth = new Liquor("Plymouth Gin", gin, {
	ABV: 0.412,
	brand: "Plymouth",
	unit_cost: 32.99,
	unit_volume: [750, "mL"]
});
const hendricks = new Liquor("Hendrick's Gin", gin, {
	ABV: 0.44,
	brand: "Hendrick's",
	unit_cost: 32.99,
	unit_volume: [750, "mL"]
});
const tanqueray = new Liquor("Tanqueray Gin", gin, {
	ABV: 0.473,
	brand: "Tanqueray",
	unit_cost: 22.99,
	unit_volume: [750, "mL"]
});
const empress_purple = new Liquor("Empress 1908 Gin", gin, {
	ABV: 0.425,
	brand: "Empress",
	unit_cost: 47.99,
	unit_volume: [1, "L"]
});
const empress_red = new Liquor("Empress Elderflower Rose Gin", gin, {
	ABV: 0.425,
	brand: "Empress",
	unit_cost: 47.99,
	unit_volume: [1, "L"]
});
const lee_lavender = new Liquor("Lee Spirits Lavender Gin", gin, {
	ABV: 0.45,
	brand: "Lee Spirits",
	unit_cost: 34.99,
	unit_volume: [750, "mL"]
});
const beefeater = new Liquor("Beefeater Gin", gin, {
	ABV: 0.40,
	brand: "Beefeater",
	unit_cost: 33.99,
	unit_volume: [1, "L"]
});

const tequila = new Liquor("Tequila", liquor);
const tequila_blanco = new Liquor("Tequila Blanco", tequila);
const descarriado_blanco = new Liquor("Descarriado Tequila Blanco", tequila_blanco, {
	ABV: 0.35,
	brand: "Descarriado",
	unit_cost: 298.00,
	unit_volume: [250, "mL"]
});
const tequila_reposado = new Liquor("Tequila Reposado", tequila);
const tresamigos_reposado = new Liquor("3 Amigos Reposado Tequila", tequila_reposado, {
	ABV: 0.40,
	brand: "3 Amigos",
	unit_cost: 34.99,
	unit_volume: [750, "mL"]
});
const tequila_anejo = new Liquor("Tequila Anejo", tequila);
const mezcal = new Liquor("Mezcal", tequila);
const mezcal_joven = new Liquor("Mezcal Joven", mezcal);
const sarao_oaxaca_espadin_tobala = new Liquor("El Sarao Oaxaca Maguey Espadin & Tobala Joven", mezcal_joven, {
	ABV: 0.45,
	brand: "El Sarao Oaxaca",
	unit_cost: 49.99,
	unit_volume: [750, "mL"]
});
const mezcal_reposado = new Liquor("Mezcal Reposado", mezcal);
const sacrificio_reposado = new Liquor("Mezcal Sacrificio Reposado", mezcal_reposado, {
	ABV: 0.40,
	brand: "Sacrificio",
	unit_cost: 41.99,
	unit_volume: [750, "mL"]
});
const mezcal_anejo = new Liquor("Mezcal Anejo", mezcal);

const rum = new Liquor("Rum", liquor);
const white_rum = new Liquor("White Rum", rum);
const georgeocean = new Liquor("George Ocean White Rum", white_rum, {
	ABV: 0.40,
	brand: "George Ocean",
	unit_cost: 24.99,
	unit_volume: [1.75, "L"]
});
const jamaican_rum = new Liquor("Jamaican Rum", rum);
const appleton = new Liquor("Appleton Estate Signature Blend", jamaican_rum, {
	ABV: 0.40,
	brand: "Appleton Estate",
	unit_cost: 23.99,
	unit_volume: [750, "mL"]
});
const barbados_rum = new Liquor("Barbados Rum", rum);
const seales = new Liquor("R. L. Seale's Rum", barbados_rum, {
	ABV: 0.43,
	brand: "R. L. Seale",
	unit_cost: 31.99,
	unit_volume: [750, "mL"]
});

const whiskey = new Liquor("Whiskey", liquor);
const rye_whiskey = new Liquor("Rye Whiskey", whiskey);
const knobcreek_rye = new Liquor("Knob Creek Rye", rye_whiskey, {
	ABV: 0.50,
	brand: "Knob Creek",
	unit_cost: 37.99,
	unit_volume: [750, "mL"]
});
const bulleit_rye = new Liquor("Bulleit Rye", rye_whiskey, {
	ABV: 0.45,
	brand: "Bulleit",
	unit_cost: 26.99,
	unit_volume: [750, "mL"]
});
const bourbon = new Liquor("Bourbon", whiskey);
const knobcreek_bourbon = new Liquor("Knob Creek Bourbon", bourbon, {
	ABV: 0.50,
	brand: "Knob Creek",
	unit_cost: 33.99,
	unit_volume: [750, "mL"]
});
const bulleit_bourbon = new Liquor("Bulleit Bourbon", bourbon, {
	ABV: 0.45,
	brand: "Bulleit",
	unit_cost: 27.99,
	unit_volume: [750, "mL"]
});
const tennessee_whiskey = new Liquor("Tennessee Whiskey", whiskey);
const gentlemanjack = new Liquor("Gentleman Jack", tennessee_whiskey, {
	ABV: 0.40,
	brand: "Jack Daniels",
	unit_cost: 43.99,
	unit_volume: [1.75, "L"]
});
const kingscreek = new Liquor("King's Creek 9-Yr", tennessee_whiskey, {
	ABV: 0.45,
	brand: "King's Creek",
	unit_cost: 37.99,
	unit_volume: [750, "mL"]
});
const scotch_whisky = new Liquor("Scotch Whisky", whiskey);
const pinch = new Liquor("Pinch Scotch", scotch_whisky, {
	ABV: 0.40,
	brand: "Pinch",
	unit_cost: 72.99,
	unit_volume: [1.75, "L"]
});
const irish_whiskey = new Liquor("Irish Whisky", whiskey);
const jameson = new Liquor("Jameson Irish Whiskey", irish_whiskey, {
	ABV: 0.40,
	brand: "Jameson",
	unit_cost: 18.99,
	unit_volume: [375, "mL"]
});

const brandy = new Liquor("Brandy", liquor);
const ej_brandy = new Liquor("E&J Brandy", brandy, {
	ABV: 0.40,
	brand: "E&J",
	unit_cost: 11.99,
	unit_volume: [750, "mL"]
});
const cognac = new Liquor("Cognac", brandy);
const hennessy = new Liquor("Hennessy", cognac, {
	ABV: 0.40,
	brand: "Hennessy",
	unit_cost: 42.99,
	unit_volume: [750, "mL"]
});

const anise_liquor = new Liquor("Anise Liquor", liquor);
const absinthe = new Liquor("Absinthe", anise_liquor);

const aperitif_digestif = new AperitifDigestif("Aperitif/Digestif", ingredients);
const aperitif = new AperitifDigestif("Aperitif", aperitif_digestif);

const spirit_aperitif = new AperitifDigestif("Spirit Aperitif", aperitif);
const aperol = new Liqueur("Aperol", spirit_aperitif, {
	ABV: 0.11,
	brand: "Aperol",
	unit_cost: 26.99,
	unit_volume: [750, "mL"]
});
const campari = new Liqueur("Campari", spirit_aperitif, {
	ABV: 0.24,
	brand: "Campari",
	unit_cost: 29.99,
	unit_volume: [750, "mL"]
});


const wine_aperitif = new AperitifDigestif("Wine Aperitif", aperitif);
const vermouth = new AperitifDigestif("Vermouth", wine_aperitif);
const dry_vermouth = new AperitifDigestif("Dry Vermouth", vermouth);
const dolin_dry = new AperitifDigestif("Dolin Dry Vermouth", dry_vermouth, {
	ABV: 0.175,
	brand: "Dolin",
	unit_cost: 16.99,
	unit_volume: [750, "mL"]
});
const rivata_dry = new AperitifDigestif("Rivata Dry Vermouth", dry_vermouth, {
	ABV: 0.18,
	brand: "Rivata",
	unit_cost: 11.49,
	unit_volume: [1.5, "L"]
});
const sweet_vermouth = new AperitifDigestif("Sweet Vermouth", vermouth);
const dolin_sweet = new AperitifDigestif("Dolin Sweet Vermouth", sweet_vermouth, {
	ABV: 0.16,
	brand: "Dolin",
	unit_cost: 15.99,
	unit_volume: [750, "mL"]
});
const rivata_sweet = new AperitifDigestif("Rivata Sweet Vermouth", sweet_vermouth, {
	ABV: 0.16,
	brand: "Rivata",
	unit_cost: 15.99,
	unit_volume: [1.5, "L"]
});

const lillet = new AperitifDigestif("Lillet", wine_aperitif);
const lillet_blanc = new AperitifDigestif("Lillet Blanc", lillet, {
	ABV: 0.17,
	brand: "Lillet",
	unit_cost: 22.99,
	unit_volume: [750, "mL"]
});
const lillet_rose = new AperitifDigestif("Lillet Rose", lillet, {
	ABV: 0.17,
	brand: "Lillet",
	unit_cost: 23.99,
	unit_volume: [750, "mL"]
});
const lillet_rouge = new AperitifDigestif("Lillet Rouge", lillet, {
	ABV: 0.17,
	brand: "Lillet",
	unit_cost: 23.99,
	unit_volume: [750, "mL"]
});

const cocchi = new AperitifDigestif("Cocchi Americano", wine_aperitif);
const cocchi_blanco = new AperitifDigestif("Cocchi Americano Blanco", cocchi, {
	ABV: 0.165,
	brand: "Cocchi",
	unit_cost: 23.99,
	unit_volume: [750, "mL"]
});
const cocchi_rosa = new AperitifDigestif("Cocchi Americano Rosa", cocchi, {
	ABV: 0.165,
	brand: "Cocchi",
	unit_cost: 23.99,
	unit_volume: [750, "mL"]
});

const digestif = new AperitifDigestif("Digestif", aperitif_digestif);
const wine_digestif = new AperitifDigestif("Wine Digestif", digestif);
const port = new AperitifDigestif("Port", wine_digestif);
const sherry = new AperitifDigestif("Sherry", wine_digestif);
const madeira = new AperitifDigestif("Madeira", wine_digestif);
const amaro = new AperitifDigestif("Amaro", digestif);
const fernet = new AperitifDigestif("Fernet Branca", amaro, {
	ABV: 0.39,
	brand: "Branca",
	unit_cost: 37.49,
	unit_volume: [750, "mL"]
});
const montenegro = new AperitifDigestif("Montenegro", amaro, {
	ABV: 0.23,
	brand: "Montenegro",
	unit_cost: 41.99,
	unit_volume: [750, "mL"]
});
const averna = new AperitifDigestif("Averna", amaro, {
	ABV: 0.39,
	brand: "Averna",
	unit_cost: 35.99,
	unit_volume: [750, "mL"]
});
const cynar = new AperitifDigestif("Cynar", amaro, {
	ABV: 0.165,
	brand: "Cynar",
	unit_cost: 32.99,
	unit_volume: [1, "L"]
});
const ramazzotti = new AperitifDigestif("Ramazzotti", amaro, {
	ABV: 0.30,
	brand: "Ramazzotti",
	unit_cost: 29.99,
	unit_volume: [750, "mL"]
});
const nonino = new AperitifDigestif("Nonino", amaro, {
	ABV: 0.35,
	brand: "Nonino",
	unit_cost: 53.49,
	unit_volume: [750, "mL"]
});
const braulio = new AperitifDigestif("Braulio", amaro, {
	ABV: 0.21,
	brand: "Braulio",
	unit_cost: 49.99,
	unit_volume: [1, "L"]
});

const liqueur = new Liqueur("Liqueur", ingredients);

const flower_liqueur = new Liqueur("Flower Liqueur", liqueur);
const elderflower = new Liqueur("Elderflower Liqueur", flower_liqueur);
const stgermain = new Liqueur("St Germain", elderflower, {
	ABV: 0.20,
	brand: "St Germain",
	unit_cost: 34.99,
	unit_volume: [750, "mL"]
});
const drillaud_elderflower = new Liqueur("Drillaud Elderflower Liqueur", elderflower, {
	ABV: 0.20,
	brand: "Drillaud",
	unit_cost: 19.99,
	unit_volume: [750, "mL"]
});
const violette = new Liqueur("Creme de Violette", flower_liqueur);
const rothman_violette = new Liqueur("Rothman & Winter Creme de Violette", violette, {
	ABV: 0.20,
	brand: "Rothman & Winter",
	unit_cost: 27.99,
	unit_volume: [750, "mL"]
});


const fruit_liqueur = new Liqueur("Fruit Liqueur", liqueur);
const hpnotiq = new Liqueur("Hpnotiq", fruit_liqueur, {
	ABV: 0.17,
	brand: "Hpnotiq",
	unit_cost: 22.99,
	unit_volume: [750, "mL"]
});
const orange_liqueur = new Liqueur("Orange Liqueur", fruit_liqueur);
const dry_curacao = new Liqueur("Pierre Ferrand Dry Curacao", orange_liqueur, {
	ABV: 0.40,
	brand: "Pierre Ferrand",
	unit_cost: 39.99,
	unit_volume: [750, "mL"]
});
const royale_orange = new Liqueur("Royale Orange Liqueur", orange_liqueur, {
	ABV: 0.40,
	brand: "Royale Orange",
	unit_cost: 29.99,
	unit_volume: [750, "mL"]
});
const grand_marnier = new Liqueur("Grand Marnier", orange_liqueur, {
	ABV: 0.40,
	brand: "Grand Marnier",
	unit_cost: 38.99,
	unit_volume: [750, "mL"]
});
const cointreau = new Liqueur("Cointreau", orange_liqueur, {
	ABV: 0.40,
	brand: "Cointreau",
	unit_cost: 40.99,
	unit_volume: [750, "mL"]
});
const banana_liqueur = new Liqueur("Banana Liqueur", fruit_liqueur);
const melon_liqueur = new Liqueur("Melon Liqueur", fruit_liqueur);
const midori = new Liqueur("Midori", melon_liqueur, {
	ABV: 0.20,
	brand: "Midori",
	unit_cost: 22.99,
	unit_volume: [750, "mL"]
});
const pricklypear_liqueur = new Liqueur("Prickly Pear Liqueur", fruit_liqueur);
const pricklypear_505 = new Liqueur("505 Spirits Prickly Pear Liqueur", pricklypear_liqueur, {
	ABV: 0.24,
	brand: "505 Spirits",
	unit_cost: 30.99,
	unit_volume: [750, "mL"]
});
const raspberry_liqueur = new Liqueur("Raspberry Liqueur", fruit_liqueur);
const chambord = new Liqueur("Chambord", raspberry_liqueur, {
	ABV: 0.165,
	brand: "Chambord",
	unit_cost: 37.99,
	unit_volume: [700, "mL"]
});
const framboise = new Liqueur("Creme de Framboise", raspberry_liqueur);
const lemon_liqueur = new Liqueur("Lemon Liqueur", fruit_liqueur);
const limoncello = new Liqueur("Limoncello", lemon_liqueur);
const caravella_limoncello = new Liqueur("Caravella Limoncello", limoncello, {
	ABV: 0.32,
	brand: "Caravella",
	unit_cost: 21.99,
	unit_volume: [750, "mL"]
});
const blackcurrant_liqueur = new Liqueur("Blackcurrant Liqueur", fruit_liqueur);
const cassis = new Liqueur("Creme de Cassis", blackcurrant_liqueur);
const drillaud_cassis = new Liqueur("Drillaud Creme de Cassis", cassis, {
	ABV: 0.15,
	brand: "Drillaud",
	unit_cost: 19.99,
	unit_volume: [750, "mL"]
});
const lejay_cassis = new Liqueur("Lejay Creme de Cassis", cassis, {
	ABV: 0.18,
	brand: "Lejay",
	unit_cost: 33.99,
	unit_volume: [700, "mL"]
});
const blackberry_liqueur = new Liqueur("Blackberry Liqueur", fruit_liqueur);
const mure = new Liqueur("Creme de Mure", blackberry_liqueur);
const giffard_mure = new Liqueur("Giffard Creme de Mure", mure, {
	ABV: 0.16,
	brand: "Giffard",
	unit_cost: 29.99,
	unit_volume: [750, "mL"]
});
const cherry_liqueur = new Liqueur("Cherry Liqueur", fruit_liqueur);
const cerise = new Liqueur("Creme de Cerise", cherry_liqueur);
const ginja_rossio_cherry = new Liqueur("Ginja Rossio Cherry Liqueur", cherry_liqueur, {
	ABV: 0.19,
	brand: "Rossio",
	unit_cost: 27.99,
	unit_volume: [700, "mL"]
});
const peach_liqueur = new Liqueur("Peach Liqueur", fruit_liqueur);
const peche = new Liqueur("Creme de Peche", peach_liqueur);
const drillaud_peche = new Liqueur("Drillaud Creme de Peche", peche, {
	ABV: 0.15,
	brand: "Drillaud",
	unit_cost: 19.99,
	unit_volume: [750, "mL"]
});
const peachschnapps = new Liqueur("Peach Schnapps", peach_liqueur);
const stacks_peach = new Liqueur("Mr. Stacks Peach Schnapps", peachschnapps, {
	ABV: 0.15,
	brand: "Mr. Stacks",
	unit_cost: 12.99,
	unit_volume: [750, "mL"]
});
const strawberry_liqueur = new Liqueur("Strawberry Liqueur", fruit_liqueur);
const aise = new Liqueur("Creme de Aise", strawberry_liqueur);
const drillaud_strawberry = new Liqueur("Drillaud Strawberry Liqueur", strawberry_liqueur, {
	ABV: 0.18,
	brand: "Drillaud",
	unit_cost: 19.99,
	unit_volume: [750, "mL"]
});
const pomegranate_liqueur = new Liqueur("Pomegranate Liqueur", fruit_liqueur);
const pama_pomegranate = new Liqueur("Pama Pomegranate Liqueur", pomegranate_liqueur, {
	ABV: 0.17,
	brand: "Pama",
	unit_cost: 22.99,
	unit_volume: [750, "mL"]
});


const nutseed_liqueur = new Liqueur("Nut/Seed Liqueur", liqueur);
const amaretto = new Liqueur("Amaretto", nutseed_liqueur);
const diamore_amaretto = new Liqueur("Di Amore Amaretto", amaretto, {
	ABV: 0.21,
	brand: "Di Amore",
	unit_cost: 15.49,
	unit_volume: [750, "mL"]
});
const lazzaroni_amaretto = new Liqueur("Lazzaroni Amaretto", amaretto, {
	ABV: 0.24,
	brand: "Lazzaroni",
	unit_cost: 25.99,
	unit_volume: [750, "mL"]
});
const luxardo_amaretto = new Liqueur("Luxardo Amaretto", amaretto, {
	ABV: 0.28,
	brand: "Luxardo",
	unit_cost: 35.99,
	unit_volume: [750, "mL"]
});
const maraschino = new Liqueur("Maraschino Liqueur", nutseed_liqueur);
const luxardo_maraschino = new Liqueur("Luxardo Maraschino Liqueur", maraschino, {
	ABV: 0.32,
	brand: "Luxardo",
	unit_cost: 37.99,
	unit_volume: [750, "mL"]
});
const noyaux = new Liqueur("Creme de Noyaux", nutseed_liqueur);


const herbspice_liqueur = new Liqueur("Herb & Spice Liqueur", liqueur);
const allspice_dram = new Liqueur("Allspice Dram", herbspice_liqueur);
const stelizabeth = new Liqueur("St. Elizabeth Allspice Dram", allspice_dram, {
	ABV: 0.225,
	brand: "St. Elizabeth",
	unit_cost: 25.99,
	unit_volume: [375, "mL"]
});
const chartreuse = new Liqueur("Chartreuse", herbspice_liqueur);
const green_chartreuse = new Liqueur("Green Chartreuse", chartreuse, {
	ABV: 0.55,
	brand: "Chartreuse",
	unit_cost: 74.99,
	unit_volume: [750, "mL"]
});
const yellow_chartreuse = new Liqueur("Yellow Chartreuse", chartreuse, {
	ABV: 0.40,
	brand: "Chartreuse",
	unit_cost: 87.99,
	unit_volume: [750, "mL"]
});
const benedictine = new Liqueur("Benedictine", herbspice_liqueur, {
	ABV: 0.55,
	brand: "Benedictine",
	unit_cost: 42.99,
	unit_volume: [750, "mL"]
});
const jagermeister = new Liqueur("Jagermeister", herbspice_liqueur, {
	ABV: 0.35,
	brand: "Jagermeister",
	unit_cost: 25.99,
	unit_volume: [750, "mL"]
});
const falernum = new Liqueur("Velvet Falernum", herbspice_liqueur, {
	ABV: 0.11,
	brand: "Velvet Falernum",
	unit_cost: 20.99,
	unit_volume: [750, "mL"]
});
const drambuie = new Liqueur("Drambuie", herbspice_liqueur, {
	ABV: 0.40,
	brand: "Drambuie",
	unit_cost: 43.99,
	unit_volume: [750, "mL"]
});
const menthe = new Liqueur("Creme de Menthe", herbspice_liqueur);
const tempus_menthe = new Liqueur("Tempus Fugit Creme de Menthe", menthe, {
	ABV: 0.28,
	brand: "Tempus Fugit",
	unit_cost: 40.99,
	unit_volume: [750, "mL"]
});
const chile_liqueur = new Liqueur("Chile Liqueur", herbspice_liqueur);
const ancho_liqueur = new Liqueur("Ancho Chile Liqueur", chile_liqueur);
const ancho_reyes = new Liqueur("Ancho Reyes Chile Liqueur", ancho_liqueur, {
	ABV: 0.40,
	brand: "Ancho Reyes",
	unit_cost: 34.99,
	unit_volume: [750, "mL"]
});
const poblano_liqueur = new Liqueur("Poblano Chile Liqueur", chile_liqueur);
const ancho_reyes_verde = new Liqueur("Ancho Reyes Verde Chile Liqueur", poblano_liqueur, {
	ABV: 0.40,
	brand: "Ancho Reyes",
	unit_cost: 34.99,
	unit_volume: [750, "mL"]
});


const coffee_liqueur = new Liqueur("Coffee Liqueur", nutseed_liqueur);
const moka = new Liqueur("Creme de Moka", coffee_liqueur);
const tempus_moka = new Liqueur("Tempus Fugit Creme de Moka", moka, {
	ABV: 0.25,
	brand: "Tempus Fugit",
	unit_cost: 39.99,
	unit_volume: [750, "mL"]
});
const mrblack_coffee = new Liqueur("Mr. Black Coffee Liqueur", coffee_liqueur, {
	ABV: 0.25,
	brand: "Mr. Black",
	unit_cost: 30.99,
	unit_volume: [750, "mL"]
});
const makaio_coffee = new Liqueur("Makaio Coffee Liqueur", coffee_liqueur, {
	ABV: 0.21,
	brand: "Makaio",
	unit_cost: 12.99,
	unit_volume: [750, "mL"]
});
const kahlua = new Liqueur("Kahlua", coffee_liqueur, {
	ABV: 0.20,
	brand: "Kahlua",
	unit_cost: 20.99,
	unit_volume: [750, "mL"]
});


const chocolate_liqueur = new Liqueur("Chocolate Liqueur", nutseed_liqueur);
const irish_cream = new Liqueur("Irish Cream", chocolate_liqueur);
const baileys = new Liqueur("Baileys", irish_cream, {
	ABV: 0.17,
	brand: "Baileys",
	unit_cost: 24.99,
	unit_volume: [750, "mL"]
});
const cacao = new Liqueur("Creme de Cacao", chocolate_liqueur);
const tempus_cacao = new Liqueur("Tempus Fugit Creme de Cacao", cacao, {
	ABV: 0.24,
	brand: "Tempus Fugit",
	unit_cost: 38.99,
	unit_volume: [750, "mL"]
});


const syrup = new Syrup("Syrup", ingredients);
const orgeat = new Syrup("Orgeat", syrup);
const alchemist_orgeat = new Liqueur("Liquid Alchemist Orgeat", orgeat, {
	brand: "Liquid Alchemist",
	unit_cost: 13.99,
	unit_volume: [375, "mL"]
});
const liberco_orgeat = new Liqueur("Liber & Co Orgeat", orgeat, {
	brand: "Liber & Co",
	unit_cost: 13.99,
	unit_volume: [17, "oz"]
});
const passionfruit = new Syrup("Passionfruit Syrup", syrup);
const alchemist_passionfruit = new Liqueur("Liquid Alchemist Passionfruit", passionfruit, {
	brand: "Liquid Alchemist",
	unit_cost: 13.99,
	unit_volume: [375, "mL"]
});
const liberco_passionfruit = new Liqueur("Liber & Co Passionfruit", passionfruit, {
	brand: "Liber & Co",
	unit_cost: 13.99,
	unit_volume: [17, "oz"]
});
const honey = new Syrup("Honey Syrup", syrup);
const simple = new Syrup("Simple Syrup", syrup);
const rich_simple = new Syrup("2:1 Simple Syrup", simple);
const thin_simple = new Syrup("1:1 Simple Syrup", simple);
const earl_grey_syrup = new Syrup("Earl Grey Syrup", syrup);
const grenadine = new Syrup("Grenadine", syrup);
const monin_grenadine = new Syrup("Monin Pomegranate", grenadine, {
	brand: "Monin",
	unit_cost: 8.99,
	unit_volume: [750, "mL"]
});


const bitters = new Bitters("Bitters", ingredients);
const spice_bitters = new Bitters("Spice Bitters", bitters);
const herb_bitters = new Bitters("Herbal Bitters", bitters);
const vegetable_bitters = new Bitters("Vegetable Bitters", bitters);
const fruit_bitters = new Bitters("Fruit Bitters", bitters);
const citrus_bitters = new Bitters("Citrus Bitters", fruit_bitters);
const nut_bitters = new Bitters("Nut Bitters", bitters);
const old_fashion = new Bitters("Old Fashion Bitters", spice_bitters);
const angostura = new Bitters("Angostura Bitters", old_fashion, {
	ABV: 0.447,
	brand: "Angostura",
	unit_cost: 11.99,
	unit_volume: [4, "oz"]
});
const peychaud = new Bitters("Peychaud's Bitters", spice_bitters, {
	ABV: 0.35,
	brand: "Peychaud",
	unit_cost: 7.99,
	unit_volume: [5, "oz"]
});
const fee_old_fashion = new Bitters("Fee Brother's Old Fashion Bitters", old_fashion, {
	ABV: 0.175,
	brand: "Fee Brother's",
	unit_cost: 9.99,
	unit_volume: [5, "oz"]
});
const fee_cardamom = new Bitters("Fee Brother's Cardamom Bitters", spice_bitters, {
	ABV: 0.084,
	brand: "Fee Brother's",
	unit_cost: 9.70,
	unit_volume: [5, "oz"]
});
const fee_walnut = new Bitters("Fee Brother's Walnut Bitters", nut_bitters, {
	ABV: 0.064,
	brand: "Fee Brother's",
	unit_cost: 9.99,
	unit_volume: [5, "oz"]
});
const fee_lemon = new Bitters("Fee Brother's Lemon Bitters", citrus_bitters, {
	ABV: 0.277,
	brand: "Fee Brother's",
	unit_cost: 9.49,
	unit_volume: [5, "oz"]
});
const fee_lime = new Bitters("Fee Brother's Lime Bitters", citrus_bitters, {
	ABV: 0.211,
	brand: "Fee Brother's",
	unit_cost: 9.98,
	unit_volume: [5, "oz"]
});
const fee_grapefruit = new Bitters("Fee Brother's Grapefruit Bitters", citrus_bitters, {
	ABV: 0.17,
	brand: "Fee Brother's",
	unit_cost: 9.49,
	unit_volume: [5, "oz"]
});
const fee_orange = new Bitters("Fee Brother's Orange Bitters", citrus_bitters, {
	ABV: 0.09,
	brand: "Fee Brother's",
	unit_cost: 9.99,
	unit_volume: [5, "oz"]
});
const fee_mint = new Bitters("Fee Brother's Mint Bitters", herb_bitters, {
	ABV: 0.358,
	brand: "Fee Brother's",
	unit_cost: 9.89,
	unit_volume: [5, "oz"]
});
const fee_plum = new Bitters("Fee Brother's Plum Bitters", fruit_bitters, {
	ABV: 0.12,
	brand: "Fee Brother's",
	unit_cost: 13.74,
	unit_volume: [5, "oz"]
});
const fee_rhubarb = new Bitters("Fee Brother's Rhubarb Bitters", vegetable_bitters, {
	ABV: 0.045,
	brand: "Fee Brother's",
	unit_cost: 9.49,
	unit_volume: [5, "oz"]
});
const fee_cherry = new Bitters("Fee Brother's Cherry Bitters", fruit_bitters, {
	ABV: 0.048,
	brand: "Fee Brother's",
	unit_cost: 9.99,
	unit_volume: [5, "oz"]
});
const fee_peach = new Bitters("Fee Brother's Peach Bitters", fruit_bitters, {
	ABV: 0.017,
	brand: "Fee Brother's",
	unit_cost: 9.49,
	unit_volume: [5, "oz"]
});

const fruit = new Fruit("Fruit", ingredients);

const citrus = new Fruit("Citrus", fruit);
const lemon = new Fruit("Lemon", citrus);
const lemon_peel = new Garnish("Lemon Twist", lemon);
const lemon_juice = new Juice("Lemon Juice", lemon, {
	unit_cost: 5.00,
	unit_count: 6,
	volume_per_count: [1.5, "oz"]
});
const lime = new Fruit("Lime", citrus);
const lime_wheel = new Garnish("Lime Wheel", lime);
const lime_peel = new Garnish("Lime Twist", lime);
const lime_juice = new Juice("Lime Juice", lime, {
	unit_cost: 4.00,
	unit_count: 6,
	volume_per_count: [1, "oz"]
});
const orange = new Fruit("Orange", citrus);
const orange_juice = new Juice("Orange Juice", orange, {
	unit_cost: 1.00,
	unit_count: 1,
	volume_per_count: [4, "oz"]
});
const orange_peel = new Garnish("Orange Twist", orange);
const grapefruit = new Fruit("Grapefruit", citrus);
const grapefruit_peel = new Garnish("Grapefruit Twist", grapefruit);
const grapefruit_juice = new Juice("Grapefruit Juice", grapefruit, {
	unit_cost: 2.00,
	unit_count: 1,
	volume_per_count: [8, "oz"]
});
const langers_grapefruit_juice = new Bottle("Langer's Ruby Red Grapefruit Juice", grapefruit_juice, {
	brand: "Langer's",
	unit_cost: 3.99,
	unit_volume: [64, "oz"]
});

const berries = new Fruit("Berries", fruit);
const strawberry = new Fruit("Strawberry", berries, {
	unit_cost: 5.00,
	unit_count: 15
});
const blueberry = new Fruit("Blueberry", berries);
const blackberry = new Fruit("Blackberry", berries);
const raspberry = new Fruit("Raspberry", berries);
const cranberry = new Fruit("Cranberry", berries);

const pome = new Fruit("Pome Fruits", fruit);
const apple = new Fruit("Apple", pome);
const pear = new Fruit("Pear", pome);

const drupe = new Fruit("Drupe Fruits", fruit);
const peach = new Fruit("Peach", drupe);
const apricot = new Fruit("Apricot", drupe);
const nectarine = new Fruit("Nectarine", drupe);
const plum = new Fruit("Plum", drupe);
const cherry = new Fruit("Cherry", drupe);
const fresh_cherry = new Fruit("Fresh Cherry", cherry, {
	unit_cost: 10.44,
	unit_count: 100
});
const luxardo_cherry = new Garnish("Luxardo Cherry", cherry, {
	unit_cost: 22.99,
	unit_count: 50
});
const parlor_cherry = new Garnish("Parlor Cherry", cherry, {
	unit_cost: 8.99,
	unit_count: 27
});

const melon = new Fruit("Melons", fruit);
const watermelon = new Fruit("Watermelon", melon);
const cantaloupe = new Fruit("Cantaloupe", melon);
const honeydew = new Fruit("Honeydew", melon);

const tropical = new Fruit("Tropical Fruit", fruit);
const banana = new Fruit("Banana", tropical);
const coconut = new Fruit("Coconut", tropical);
const kiwi = new Fruit("Kiwi", tropical);


const herb = new Ingredient("Herb", ingredients);
const mint = new Garnish("Mint Sprig", herb);
const spice = new Ingredient("Spice", ingredients);
const tajin_rim = new Garnish("Tajin Rim", spice);
const salt_rim = new Garnish("Salt Rim", spice);
const pop = new Bottle("Pop", ingredients);
const soda = new Bottle("Soda Water", pop, {
	unit_cost: 3.14,
	unit_volume: [45, "oz"],
	brand: "Great Value"
});
const gingerbeer = new Bottle("Ginger Beer", pop, {
	unit_cost: 7.99,
	unit_volume: [150, "mL"],
	brand: "Fever Tree"
});
const dairy = new Ingredient("Dairy", ingredients);
const coffee = new Ingredient("Coffee", ingredients);
const cold_brew_extract = new Ingredient("Cold Brew Extract", coffee);
