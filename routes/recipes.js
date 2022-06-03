var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

/**
 * get 3 random recipes
 */

router.get('/Random', async (req,res,next)=>{
  try {
    const user_id = req.session.user_id; // maybe null
    const randoms = await recipes_utils.getRandomRecipes(user_id);
    res.send(randoms);
  } catch (error) {
    next(error);
  }
})

/**
 * get options for recipe search
 */
 router.get('/Options/RecipeSearch', async (req,res,next)=>{
  try {
    const options = await recipes_utils.getOptions();
    res.send(options);
  } catch (error) {
    next(error);
  }
})

/**
 * search for recipes
 */
 router.get('/', async (req,res,next)=>{
  try {
    let amount = req.query.amount;
    let search = req.query.search;
    let cousine = req.query.cousine;
    let diet = req.query.diet;
    let intolerances = req.query.intolerances;
    const user_id = req.session.user_id; // maybe null
    const results = await recipes_utils.searchRecipes(amount, search, cousine, diet, intolerances, user_id);
    res.send(results);
  } catch (error) {
    next(error);
  }
})

/**
 * This path returns a full details of a recipe by its id
 */
router.get("/ExtendedRecipes/:recipeId", async (req, res, next) => {
  try {
    const user_id = req.session.user_id; // maybe null
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId, user_id);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

/**
 * get family recipes
 */
 router.get('/FamilyRecipes', async (req,res,next)=>{

})

module.exports = router;
