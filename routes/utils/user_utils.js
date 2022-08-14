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
    const check = `
    INSERT INTO innerrecipes VALUES(default,'${mysql_real_escape_string(recepiePreview.title)}',${recepiePreview.prepTime}, 0, ${recepiePreview.glutenFree},
    ${recepiePreview.vegan},'${mysql_real_escape_string(recepiePreview.imageUri)}','${mysql_real_escape_string(ingredients)}', '${mysql_real_escape_string(prepInstructions)}', ${numberOfDishes}, 0, ${user_id})    
    `;
    await DButils.execQuery(check);
}

async function getUserLastSeen(user_id){
    const recipes_id = await DButils.execQuery(`SELECT DISTINCT recipe_id 
        FROM recipeseen WHERE user_id = ${user_id} ORDER BY id desc LIMIT 3;`);
    return recipes_id;
}
function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return " ";
            case "\x08":
                return " ";
            case "\x09":
                return " ";
            case "\x1a":
                return " ";
            case "\n":
                return " ";
            case "\r":
                return " ";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}
exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.getMyRecipes = getMyRecipes;
exports.addRecipe = addRecipe;
exports.getUserLastSeen = getUserLastSeen;