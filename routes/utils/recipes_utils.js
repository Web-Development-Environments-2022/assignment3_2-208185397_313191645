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


async function getRecipeDetails(recipe_id, user_id) {
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
    if(user_id != undefined) await addUserRecipeToWatched(id, user_id) 
    return {
        recepiePreview: {
            id: id,
            title: title,
            prepTime: readyInMinutes,
            popularty: aggregateLikes,
            glutFree: glutenFree,
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
    let to_return = []
    for(const element of data.data.recipes){
        let alreadyWatched = await checkUserRecipeInTable("O"+element.id.toString(), user_id, "recipeseen")
        let inFavorites = await checkUserRecipeInTable("O"+element.id.toString(), user_id, "favoriterecipes")
        to_return.push(
            {
                id: "O"+element.id.toString(),
                title: element.title,
                prepTime: element.readyInMinutes,
                popularty: element.aggregateLikes,
                glutFree: element.glutenFree,
                vegan: element.vegan,
                alreadyWatched: alreadyWatched,
                inFavorites: inFavorites,
                imageUri: element.image
            }
        );
    }
    return to_return;  
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

exports.getRecipeDetails = getRecipeDetails;
exports.getRandomRecipes = getRandomRecipes;
exports.getOptions = getOptions;


