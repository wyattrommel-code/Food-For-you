# Whole recipe photo audit — 2026-09-12

All **169 shared recipes now have a reviewed photo assignment**. The completion overlay fills the 21 fields left empty by the initial audit. All 21 published JPEGs passed MIME, byte-length and SHA-256 checks. The guarded SQL passed a rollback trial and was applied. The public API verified all 169 photo assignments, 41 final photo overlays and zero private rows. All 55 tests passed.

The completion adds 18 Creative Commons photos and reuses 3 existing library images. No new AI generation, paid API or subscription was used. All images are resized to at most 900 pixels on either side, with aspect ratio preserved. Original recipe ingredients, instructions, ownership and dietary tags are unchanged.

These are representative serving photos, not photographs of cooked tests of these exact recipes. Variations in sides, garnish, pasta shape or preparation are disclosed in each recipe description alongside photographer credit, source and license. Share-alike images retain their image licenses. The old Ground Beef Tacos image remains flagged for a closer tortilla match.

The original audit found 142 loading images, 11 broken Manus links and 16 empty fields. Its first repair restored 7 images and removed 10 unusable/misleading URLs, leaving 21 empty fields. Both earlier overlays remain immutable; the full JSON checklist records the latest assignments and preserves earlier rejected-image notes.

## Completion photos

| Recipe | Source | Serving variation |
|---|---|---|
| 20-Minute Honey Garlic Chicken | [Existing Mealsolved image library](https://yhfqlvblqlpacjdkltfi.supabase.co/storage/v1/object/public/meal-photos/bourbon_chicken.jpg) | Serving illustration of glazed chicken over rice. Sauce color and garnish may vary. |
| Beef and Rice Skillet | [UCFFool](https://www.flickr.com/photos/36762416@N04/3439524063) | Serving example shows tomato-seasoned ground beef over rice; this recipe cooks them together and adds cheddar. |
| Classic Rice and Beans | [Stacy Spensley](https://www.flickr.com/photos/21001756@N06/8083012836) | Serving example includes avocado, corn and herbs; these are optional extras, not required by this recipe. |
| Fried Bologna Sandwich | [bnpositive](https://www.flickr.com/photos/74089168@N00/14666810430) | Serving example shows the fried bologna beside toasted bread; assemble with the cheese and mustard in the recipe. |
| Homemade Ramen | [City Foodsters](https://www.flickr.com/photos/89060048@N03/21421392715) | Representative chicken ramen with egg. Broth, chicken cut and vegetable toppings differ from this homemade version. |
| Loaded Baked Potato Dinner | [Existing Mealsolved image library](https://yhfqlvblqlpacjdkltfi.supabase.co/storage/v1/object/public/meal-photos/hero/loaded_twice_baked_potatoes.jpg) | Serving illustration uses a mashed, twice-baked filling with bacon and cheese. This recipe keeps the baked potato filling fluffy and adds sour cream. |
| One-Pan Creamy Chicken and Rice | [idovermani](https://www.flickr.com/photos/11155746@N00/3264550785) | Serving example is a baked chicken-and-rice casserole; this recipe is cooked on the stovetop. |
| One-Pot Creamy Sausage Pasta | [Ruth and Dave](https://www.flickr.com/photos/95142644@N00/11594881594) | Serving example shows creamy sausage macaroni with cheese. This recipe uses rotini or penne, cream and tomatoes. |
| Pan-Seared Pork Chops with Pan Gravy | [Existing Mealsolved image library](https://yhfqlvblqlpacjdkltfi.supabase.co/storage/v1/object/public/meal-photos/pork_chops_gravy.jpg) | Serving illustration includes onion gravy, mashed potatoes and green beans. This recipe makes a simple creamy pan gravy. |
| Pinto Beans and Cornbread | [trekkyandy](https://www.flickr.com/photos/87054972@N00/2429667213) | Serving example includes mustard greens on the side. |
| Quick Beef and Broccoli over Rice | [tedeytan](https://www.flickr.com/photos/22526649@N03/48588252551) | Photo shows the ground beef and broccoli before serving over rice. |
| Roasted Pepper and Hummus Pitas | [Satdeep Gill](https://commons.wikimedia.org/wiki/File:Homemade_hummus_and_pita_03.jpg) | Serving example shows homemade pita, hummus and chopped vegetables. This recipe uses roasted peppers, cucumber, spinach and feta. |
| Sausage and Potato Skillet | [jeffreyw](https://www.flickr.com/photos/7927684@N03/32556579956) | Serving example includes baked beans on the side; this recipe adds bell pepper and onion to the skillet. |
| Sausage, White Bean and Spinach Skillet | [Neeta Lind](https://www.flickr.com/photos/71132408@N00/16045274215) | Serving example is a white-bean and sausage bake with a crumb topping. This recipe uses crumbled sausage and spinach in a skillet, without crumbs. |
| Sheet Pan Sausage and Peppers | [Key West Wedding Photography](https://www.flickr.com/photos/58003213@N00/45205797612) | Serving example shows whole Italian sausages and peppers in a skillet. This recipe roasts sliced kielbasa and peppers on a sheet pan. |
| Simple Bean and Cheese Burritos | [jeffreyw](https://www.flickr.com/photos/7927684@N03/8169763053) | Serving example includes extra vegetables and crumbled cheese as garnish. |
| Simple Beef Vegetable Soup | [Carol (vanhookc)](https://www.flickr.com/photos/97651299@N00/16237834089) | Serving example includes extra corn, beans and noodles. Follow the simpler ingredients listed below. |
| Stovetop Tuna Noodle Skillet | [Micah Sittig](https://www.flickr.com/photos/35468134321@N01/3394865184) | Serving example uses long noodles. This recipe uses egg noodles and finishes with cheddar. |
| Tuna and Mixed Bean Lunch Bowls | [Katrin Gilger](https://www.flickr.com/photos/26242865@N04/7327273414) | Serving example uses white beans, red onion and herbs; this recipe uses mixed beans and cucumber. |
| Tuna Noodle Casserole | [Hammer51012](https://www.flickr.com/photos/7365168@N03/27237574821) | Serving example includes toast on the side; the breadcrumb topping may look different. |
| Turkey and Hummus Cold Plates | [anotherlunch.com](https://www.flickr.com/photos/44176993@N03/8538636041) | Packed-lunch serving example shows turkey, cheese, crackers, carrots and pear. This recipe includes hummus, cucumber and apple. |

## Full checklist

| Recipe | Result | Review notes |
|---|---|---|
| 20-Minute Honey Garlic Chicken | usable with serving variation | Serving illustration of glazed chicken over rice. Sauce color and garnish may vary. |
| Avocado Toast | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Bacon-Wrapped Jalapeno Poppers | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Bacon, Egg & Cheese Breakfast Sandwich | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Baked Ziti | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Banana Bread | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| BBQ Baby Back Ribs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| BBQ Grilled Pork Chops | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| BBQ Pulled Chicken Sandwiches | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| BBQ Smash Burgers | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Beef and Rice Skillet | usable with serving variation | Serving example shows tomato-seasoned ground beef over rice; this recipe cooks them together and adds cheddar. |
| Beef Birria Tacos | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Beef Lo Mein | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Beer Can Smoked Chicken | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Boxed Beef Pasta with Green Beans | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Boxed Mac and Canned Chili Dinner | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Breakfast Burrito | usable with serving variation | Core breakfast burrito matches; photograph uses sausage pieces that look sliced rather than loose ground sausage. |
| Buffalo Chicken Dip | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Buttered Garlic Egg Noodles | usable with serving variation | Egg noodles match; photo includes a parsley garnish absent from the simplified recipe. |
| Buttered Toast with Jam | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Buttermilk Pancakes from Scratch | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Carrot Cake with Cream Cheese Frosting | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Cheese Quesadillas with Fresh Pico de Gallo | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Cheese Quesadillas with Guacamole | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Chicken and Drop Dumplings | usable | Chicken, round drop dumplings, carrots and celery in broth match the listed preparation. |
| Chicken and Potato Enchilada Skillet | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Chicken Caesar Wrap | usable with serving variation | Chicken, romaine and tortilla match. Croutons beside the wrap are a serving prop, not a listed ingredient. |
| Chicken Enchiladas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Chicken Parmesan | usable with serving variation | Chicken Parmesan matches. Pasta underneath is a serving suggestion and is not included in this recipe. |
| Chicken Tikka Masala | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Chickpea and Pickle Sandwiches | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Chocolate Lava Cakes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic American Potato Salad | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Beef Stew | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic BLT Sandwich | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Cereal Bowl | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Cheese Omelette | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Chicken Noodle Soup | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Chicken Pot Pie | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Chocolate Chip Cookies | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Chocolate Fudge | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Chocolate Layer Cake | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Creamy Coleslaw | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Deviled Eggs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Fluffy Pancakes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic French Onion Soup | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic French Toast | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Fried Rice | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Fudgy Brownies | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Garlic Mashed Potatoes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Green Bean Casserole | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Grilled Cheese | usable with serving variation | Grilled cheese matches. Tomato soup in the background is a serving suggestion, not part of this recipe. |
| Classic Guacamole | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Homemade Beef Chili | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Homemade Lasagna | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Meatloaf | usable with serving variation | Meatloaf matches. Mashed potatoes and vegetables are serving suggestions. |
| Classic Philly Cheesesteak | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Rice and Beans | usable with serving variation | Serving example includes avocado, corn and herbs; these are optional extras, not required by this recipe. |
| Classic Scrambled Eggs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Skillet Cornbread | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Sloppy Joes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Smash Burger | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Snickerdoodles | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Spaghetti with Meat Sauce | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Strawberry Shortcake | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Stuffed Bell Peppers | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Tiramisu | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Classic Tuna Salad Sandwich | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Chicken Alfredo | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Macaroni Salad | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Pasta Salad | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Roasted Tomato Soup | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Scalloped Potatoes au Gratin | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creamy Tortellini and Vegetable Soup | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Creme Brulee | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Crispy Baked Chicken Thighs | usable with serving variation | Bone-in chicken thighs match. Roasted vegetables in the image are serving suggestions. |
| Crispy Skillet Hash Browns | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Crispy Smashed Potatoes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Eggs Benedict with Hollandaise | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| English Muffin Pizzas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Four-Ingredient Ravioli Bake | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Fried Bologna Sandwich | usable with serving variation | Serving example shows the fried bologna beside toasted bread; assemble with the cheese and mustard in the recipe. |
| Fried Egg Sandwich | usable with serving variation | Fried egg and melted cheese sandwich matches the main dish. Rye bread differs from the white bread specified; the visible caption discloses this serving variation. |
| Garden Salad with Red Wine Vinaigrette | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Garlic Butter Corn on the Cob | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Garlic Butter Shrimp Pasta | usable | Shrimp, thin pasta, garlic butter, lemon and parsley match. Existing image replaces a Manus CDN URL that returns 403. |
| German Potato Salad | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Grilled BBQ Chicken Thighs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Grilled BBQ Hot Dogs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Grilled Cheese with Homemade Tomato Soup | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Grilled Elote Street Corn | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Grilled PB&J Sandwiches | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Ground Beef Stroganoff with Egg Noodles | usable | Checked at full resolution: visible ground-beef crumbles, sliced mushrooms and egg noodles match; retain. |
| Ground Beef Tacos | needs closer match | Recipe now calls for soft flour tortillas; current image shows crispy corn shells and extra toppings. Retained as a taco illustration but still needs a closer match. |
| Homemade Baked Mac and Cheese | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Belgian Waffles | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Blondies | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Bolognese with Tagliatelle | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Chicken Nuggets | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Cinnamon Rolls | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Corn Dogs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Dinner Rolls | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Fish Sticks | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Lemon Bars | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Meatballs with Marinara and Spaghetti | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Pizza from Scratch | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Homemade Ramen | usable with serving variation | Representative chicken ramen with egg. Broth, chicken cut and vegetable toppings differ from this homemade version. |
| Homemade Soft Pretzels | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Honey Jalapeno Cornbread | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Hot Spinach & Artichoke Dip | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Loaded Baked Potato Dinner | usable with serving variation | Serving illustration uses a mashed, twice-baked filling with bacon and cheese. This recipe keeps the baked potato filling fluffy and adds sour cream. |
| Loaded Ballpark Hot Dogs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Loaded Frozen Pizza Night | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Loaded Mini Pita Pizzas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Loaded Twice-Baked Potatoes | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Mild White Bean and Spinach Quesadillas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| No-Bake Chocolate Peanut Butter Oat Cookies | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| One-Pan Creamy Chicken and Rice | usable with serving variation | Serving example is a baked chicken-and-rice casserole; this recipe is cooked on the stovetop. |
| One-Pan Creamy Tomato Pasta | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| One-Pot Cheeseburger Pasta | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| One-Pot Creamy Sausage Pasta | usable with serving variation | Serving example shows creamy sausage macaroni with cheese. This recipe uses rotini or penne, cream and tomatoes. |
| Oven Beef Sliders | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Oven Sweet Potato Fries | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Oven-Baked Baby Back Ribs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Overnight Oats | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Pan-Seared Pork Chops with Pan Gravy | usable with serving variation | Serving illustration includes onion gravy, mashed potatoes and green beans. This recipe makes a simple creamy pan gravy. |
| Peanut Ramen with Edamame | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Pepperoni and Pepper Pizzadillas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Pesto Couscous and Feta Bowls | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Philly Cheesesteak | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Pinto Beans and Cornbread | usable with serving variation | Serving example includes mustard greens on the side. |
| Plain Cereal | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Quick Beef and Broccoli over Rice | usable with serving variation | Photo shows the ground beef and broccoli before serving over rice. |
| Rice Krispie Treats | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Roasted Brussels Sprouts with Bacon | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Roasted Garlic Green Beans | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Roasted Pepper and Hummus Pitas | usable with serving variation | Serving example shows homemade pita, hummus and chopped vegetables. This recipe uses roasted peppers, cucumber, spinach and feta. |
| Rotisserie Chicken and Stuffing Bake | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Sausage and Potato Skillet | usable with serving variation | Serving example includes baked beans on the side; this recipe adds bell pepper and onion to the skillet. |
| Sausage, White Bean and Spinach Skillet | usable with serving variation | Serving example is a white-bean and sausage bake with a crumb topping. This recipe uses crumbled sausage and spinach in a skillet, without crumbs. |
| Seasoned Steak Fries | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Shakshuka | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Sheet Pan Sausage and Peppers | usable with serving variation | Serving example shows whole Italian sausages and peppers in a skillet. This recipe roasts sliced kielbasa and peppers on a sheet pan. |
| Shepherd's Pie | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Shortcut Biscuits and Sausage Gravy | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Shortcut Rotisserie Chicken Noodle Soup | usable | Chicken, egg noodles, carrots and celery in broth match. Bread in the background is a serving suggestion. |
| Shrimp Fajitas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Shrimp Scampi with Linguine | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Simple Bean and Cheese Burritos | usable with serving variation | Serving example includes extra vegetables and crumbled cheese as garnish. |
| Simple Beef Vegetable Soup | usable with serving variation | Serving example includes extra corn, beans and noodles. Follow the simpler ingredients listed below. |
| Simple Potato Soup | usable with serving variation | Plain pale creamy cheddar-potato soup matches the dish and contains no visible ham or extra vegetable topping. The photograph is smoother than a lightly mashed home version. |
| Skillet Chicken Fajitas | usable with serving variation | Cooked chicken strips, peppers, onions, flour tortillas and lime match the dish. Presented on a tray; the recipe uses a skillet. Pepper color varies. |
| Slow-Cooked Pork Carnitas | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Smoked Beef Short Ribs | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Smoked Chicken Wings | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Smoked Pulled Pork Sliders | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Smoked Sausage Links | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Smoky BBQ Baked Beans | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Southern Baked Beans | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Southern Fried Chicken | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Southern Fried Potatoes and Onions | usable with serving variation | Clearly shows browned pan-fried potato slices. Onion is not visible, so this is labeled as a representative potato image rather than a photo of the full finished recipe. |
| Steamed Broccoli with Garlic Butter | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Stovetop Tuna Noodle Skillet | usable with serving variation | Serving example uses long noodles. This recipe uses egg noodles and finishes with cheddar. |
| Sunday Pot Roast with Gravy | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Texas-Style Smoked Beef Brisket | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
| Tuna and Mixed Bean Lunch Bowls | usable with serving variation | Serving example uses white beans, red onion and herbs; this recipe uses mixed beans and cucumber. |
| Tuna Noodle Casserole | usable with serving variation | Serving example includes toast on the side; the breadcrumb topping may look different. |
| Turkey and Hummus Cold Plates | usable with serving variation | Packed-lunch serving example shows turkey, cheese, crackers, carrots and pear. This recipe includes hummus, cucumber and apple. |
| Yellow Butter Cake with Chocolate Frosting | usable | Main dish matches; image is clear at card and detail size. Serving illustration, not proof of a cooked recipe test. |
