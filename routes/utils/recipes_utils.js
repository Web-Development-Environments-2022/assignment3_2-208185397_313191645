const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */

async function getRecipeInformationFromApi(recipe_id) {
    let data = await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
    let ingredients = "";
    data.data.extendedIngredients.forEach((element) => 
        ingredients = ingredients+element.name+" | "+element.amount.toString()+element.unit+" & ")
    return {
        id:"O"+data.data.id.toString(),
        title: data.data.title,
        readyInMinutes: data.data.readyInMinutes,
        image: data.data.image,
        aggregateLikes: data.data.aggregateLikes,
        prepInstructions: data.data.instructions,
        ingredients: ingredients,
        numberOfDishes: data.data.servings,
        vegan: data.data.vegan,
        glutenFree: data.data.glutenFree
    }; // extract the json fields we need

}

async function getRecipeInformationFromDb(recipe_id){
    const data = await DButils.execQuery(`SELECT * FROM InnerRecipes WHERE id = ${recipe_id}`);
    return {
        id:"I"+data[0].id.toString(),
        title: data[0].title,
        readyInMinutes: data[0].prep_time,
        image: data[0].image_uri,
        aggregateLikes: data[0].popularity,
        prepInstructions: data[0].prep_instructions,
        ingredients: data[0].ingredients,
        numberOfDishes: data[0].number_of_dishes,
        vegan: (data[0].vegan.data==1),
        glutenFree: (data[0].gluten_free.data==1)
    }; // get first element (only one) fields needed
}


async function getRecipeDetails(recipe_id, user_id, add_to_watched) {
    let datasource = recipe_id.substring(0,1)
    recipe_id = recipe_id.substring(1)
    let recipe_info = null;
    if(datasource=='O'){
        recipe_info = await getRecipeInformationFromApi(recipe_id);
    }
    else if(datasource=='I'){
        recipe_info = await getRecipeInformationFromDb(recipe_id);
    }
    else{ // neither inner or outer
        throw { status: 404, message: "no such recipe" };
    }
    
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, 
        glutenFree,ingredients, prepInstructions, numberOfDishes } = recipe_info;
    
    // we dont need it in the extended view
    let alreadyWatched = await checkUserRecipeInTable(id, user_id, "recipeseen")
    let inFavorites = await checkUserRecipeInTable(id, user_id, "favoriterecipes")
    
    //user watched the recipe
    if(user_id != undefined && add_to_watched) 
        await addUserRecipeToWatched(id, user_id) 
    return {
        recepiePreview: {
            id: id,
            title: title,
            prepTime: readyInMinutes,
            popularity: aggregateLikes,
            glutenFree: glutenFree,
            vegan: vegan,
            alreadyWatched: alreadyWatched,
            inFavorites: inFavorites,
            imageUri: image           
        }, 
        ingredients: ingredients, 
        prepInstructions: prepInstructions, 
        numberOfDishes: numberOfDishes
    }
}

async function getRandomRecipes(user_id){
    let data = await getRandomRecipesFromApi(3, user_id);
    return data;
}

async function getRandomRecipesFromApi(recipe_amount ,user_id){
    let data = await axios.get(`${api_domain}/random`, {
        params: {
            number : recipe_amount,
            apiKey: process.env.spooncular_apiKey
        }
    });
    return await adjustApiJson(data.data.recipes, user_id);
}

async function checkUserRecipeInTable(recipe_id, user_id, table_name){
    if(user_id == undefined) return false;
    return (await DButils.execQuery
        (`SELECT * FROM ${table_name} WHERE user_id = '${user_id}' and recipe_id = '${recipe_id}'`)).length>0;
}

async function addUserRecipeToWatched(recipe_id, user_id){
    if(user_id != undefined && recipe_id != undefined){
        await DButils.execQuery
        (`INSERT INTO recipeseen VALUES(default,${user_id},'${recipe_id}')`)
    }    
}

async function getOptions(){
    let data = await DButils.execQuery
        (`SELECT * FROM recipeoptions`);
    let cousines = [];
    let diets = [];
    let intolerances = [];
    for(element of data){
        switch(element.option_type){
            case "Cuisines":
                cousines.push(element.choice)    
                break;
            case "Diet Definitions":
                diets.push(element.choice)    
                break;
            case "Intolerances":
                intolerances.push(element.choice)    
                break;
        }        
    }
    return {
        cousines:cousines, diets:diets, intolerances:intolerances
    }
}

async function searchRecipes(amount, search, cousine, diet, intolerances, user_id){
    let spoonacular_dat = await getApiRecipes(amount, search, cousine, diet, intolerances, user_id);
    if(cousine!=undefined || diet!=undefined || intolerances!=undefined) return spoonacular_dat;
    // not filtered so we can return also local data    
    let local_dat = await getDbRecipes(amount, search, user_id);
    let total_data = spoonacular_dat.concat(local_dat);
    // shuffle and return top <amount>
    total_data = total_data
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    return total_data.slice(0,amount);
}

async function getDbRecipes(amount, search, user_id){
    return queryAndAdjustDb(`SELECT * FROM InnerRecipes 
        WHERE title like '%${search}%' LIMIT ${amount};`,user_id);
}

async function getApiRecipes(amount, search, cousine, diet, intolerances, user_id){
    let data = await axios.get(`${api_domain}/complexSearch`, {
        params: {
            query : search,
            number : amount,
            // client sends as list, api expects comma seperated
            excludeCuisine: Array.isArray(cousine) ? cousine.join() : cousine,
            intolerances : Array.isArray(intolerances) ? intolerances.join() : intolerances,
            diet : diet,
            addRecipeInformation : true,
            apiKey: process.env.spooncular_apiKey
        }
    });
    return await adjustApiJson(data.data.results, user_id);
}

async function adjustApiJson(api_data, user_id){
    // change the spooncular api format to ours
    let to_return = []
    for(const element of api_data){
        let alreadyWatched = await checkUserRecipeInTable("O"+element.id.toString(), user_id, "recipeseen")
        let inFavorites = await checkUserRecipeInTable("O"+element.id.toString(), user_id, "favoriterecipes")
        to_return.push(
            {
                id: "O"+element.id.toString(),
                title: element.title,
                prepTime: element.readyInMinutes,
                popularity: element.aggregateLikes,
                glutenFree: element.glutenFree,
                vegan: element.vegan,
                alreadyWatched: alreadyWatched,
                inFavorites: inFavorites,
                imageUri: element.image
            }
        );
    }
    return to_return;
}

async function queryAndAdjustDb(query, user_id){
    const data = await DButils.execQuery(query);
    let to_ret = [];
    for (let recipe of data){
        let alreadyWatched = await checkUserRecipeInTable("I"+recipe.id.toString(), user_id, "recipeseen")
        let inFavorites = await checkUserRecipeInTable("I"+recipe.id.toString(), user_id, "favoriterecipes")
        to_ret.push(
            {
                id:"I"+recipe.id.toString(),
                title: recipe.title,
                prepTime: recipe.prep_time,                
                popularity: recipe.popularity,
                //prepInstructions: recipe.prep_instructions,
                //ingredients: recipe.ingredients,
                //numberOfDishes: recipe.number_of_dishes,
                glutenFree: (recipe.gluten_free.data==1),
                vegan: (recipe.vegan.data==1),                
                alreadyWatched: alreadyWatched,
                inFavorites: inFavorites,
                imageUri: recipe.image_uri
            }
        );
    }
    return to_ret;
}
async function getFamilyRecipes(user_id){
    return queryAndAdjustDb
        (`SELECT * FROM innerrecipes WHERE is_family = 1;`, user_id);
}

async function getRecipesPreview(recipes_id_array, user_id){
    let to_ret = [];
    let promises = [];
    for(rec of recipes_id_array){
        promises.push(getRecipeDetails(rec, user_id, add_to_watched = false));
    }
    await Promise.all(promises)
        .then((results)=>{
            to_ret = results.map((ret)=>ret.recepiePreview);
        });
    return to_ret;
}

exports.getRecipeDetails = getRecipeDetails;
exports.getRandomRecipes = getRandomRecipes;
exports.getOptions = getOptions;
exports.searchRecipes = searchRecipes;
exports.getFamilyRecipes = getFamilyRecipes;
exports.getRecipesPreview = getRecipesPreview;