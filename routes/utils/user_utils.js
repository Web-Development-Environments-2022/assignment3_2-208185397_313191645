const res = require("express/lib/response");
const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    let favs = await getFavoriteRecipes(user_id);
    if(favs.some((rec) => rec.recipe_id == recipe_id)) return;
    await DButils.execQuery(`insert into FavoriteRecipes values ('${user_id}','${recipe_id}')`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from FavoriteRecipes where user_id='${user_id}'`);
    return recipes_id;
}

async function getMyRecipes(user_id){
    const recipes_id = await DButils.execQuery(`SELECT CONCAT('I',id) as recipe_id
        FROM innerrecipes WHERE creating_user_id = ${user_id}`);
    return recipes_id;
}
async function addRecipe(user_id, recepiePreview, ingredients, prepInstructions, numberOfDishes){
    await DButils.execQuery(`
    INSERT INTO innerrecipes VALUES(default,'${recepiePreview.title}',${recepiePreview.prepTime}, 0, ${recepiePreview.glutFree},
    ${recepiePreview.vegan},'${recepiePreview.imageUri}','${ingredients}', '${prepInstructions}', ${numberOfDishes}, 0, ${user_id})    
    `);
}

async function getUserLastSeen(user_id){
    const recipes_id = await DButils.execQuery(`SELECT DISTINCT recipe_id 
        FROM recipeseen WHERE user_id = ${user_id} ORDER BY id desc LIMIT 3;`);
    return recipes_id;
}

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.getMyRecipes = getMyRecipes;
exports.addRecipe = addRecipe;
exports.getUserLastSeen = getUserLastSeen;