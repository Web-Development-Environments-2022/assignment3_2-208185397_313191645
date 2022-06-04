var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/FavoriteRecipes', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/FavoriteRecipes', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    let favorite_recipes = {};
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array, user_id);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});

// get user's recepies
router.get('/MyRecipes', async(req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getMyRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array, user_id);
    res.status(200).send(results);
  }
  catch(error){
    next(error);
  }
})

// create a recepie for user
router.post('/MyRecipes', async(req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recepiePreview = req.body.recepiePreview;
    const ingredients = req.body.ingredients;
    const prepInstructions = req.body.prepInstructions;
    const numberOfDishes = req.body.numberOfDishes;
    await user_utils.addRecipe(user_id, recepiePreview, ingredients, prepInstructions, numberOfDishes);
    res.status(200).send("The Recipe was successfully added");
    } catch(error){
    next(error);
  }
})

// get users last seen recipes
router.get('/LastSeen', async(req, res,next) =>{
  try{
    const user_id = req.session.user_id;    
    const recipes_id = await user_utils.getUserLastSeen(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array, user_id);
    res.status(200).send(results);    
  } catch(error){
    next(error); 
  }
})

module.exports = router;
