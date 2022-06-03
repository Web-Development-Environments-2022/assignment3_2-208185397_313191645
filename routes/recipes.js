var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

router.get("/", (req, res) => res.send("im here"));

/**
 * get 3 random recipes
 */

router.get('/Recipes/Random', async (req,res,next)=>{

})

/**
 * get options for recipe search
 */
 router.get('/Options/RecipeSearch', async (req,res,next)=>{

})

/**
 * search for recipes
 */
 router.get('/Recipes', async (req,res,next)=>{

})

/**
 * This path returns a full details of a recipe by its id
 */
router.get("/Recipes/ExtendedRecipes/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

/**
 * get family recipes
 */
 router.get('/Recipes/FamilyRecipes', async (req,res,next)=>{

})

module.exports = router;
