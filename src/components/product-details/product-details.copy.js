const productDescriptions = new Map([
  ["Brown Brim", "A deep brown hat with a pinched crown and a wide brim. The darker band gives the shape a subtle contrast."],
  ["Blue Beanie", "A blue rib-knit beanie with a tall crown. Wear it with a neutral coat or let the colour stand out against another bright layer."],
  ["Brown Cowboy", "A brown western-style hat with a shaped crown and upturned brim. The silhouette brings a strong line to a simple outfit."],
  ["Grey Brim", "A grey brimmed hat with a pinched crown and a narrow band. The muted colour sits easily with blue, brown or black layers."],
  ["Green Beanie", "A deep green rib-knit beanie with a folded cuff. Its compact profile works well with a denim jacket or a plain coat."],
  ["Palm Tree Cap", "A pale blue cap with a curved peak and a small palm-tree motif. An easy way to add a little colour to a plain tee."],
  ["Red Beanie", "A bright red rib-knit beanie with a folded cuff. It makes a strong colour accent against a white tee or a dark coat."],
  ["Wolf Cap", "A dark cap with a flat peak and contrasting orange lettering. The lettering gives an otherwise muted cap a bright accent."],
  ["Blue Snapback", "A light blue snapback with a flat peak. The single colour keeps the shape easy to pair with patterned or plain pieces."],
  ["Adidas NMD", "A black low-top with a white sole and orange and blue accents at the heel. The colour blocks are especially visible with cropped trousers."],
  ["Adidas Yeezy", "A pale, patterned low-top with tonal laces and a sculpted sole. The rounded shape gives the shoe a distinctive profile."],
  ["Black Converse", "A black lace-up high-top with a tonal finish from upper to sole. Wear it with a cuffed hem to show the higher ankle profile."],
  ["Nike White AirForce", "A white lace-up high-top with tonal laces and a rounded toe. The all-white finish makes it easy to pair with denim or relaxed trousers."],
  ["Nike Red High Tops", "Red and white high-tops with a black swoosh and white laces. The contrasting panels are the focus of the shoe."],
  ["Nike Brown High Tops", "Tan, white and black panels define these lace-up high-tops. Their warmer colour palette pairs naturally with darker denim."],
  ["Air Jordan Limited", "White and black high-tops with a small orange accent at the sole. The contrasting shapes stand out against a simple trouser hem."],
  ["Timberlands", "Wheat-coloured lace-up boots with metal eyelets and a dark sole. The high ankle and warm tone pair well with straight-leg denim."],
  ["Black Jean Shearling", "A black jean-style jacket with a button front. Its dark finish sits well over a graphic tee or a simple base layer."],
  ["Blue Jean Jacket", "A blue jean jacket with a button front and chest pockets. An easy outer layer over a plain tee."],
  ["Grey Jean Jacket", "A faded grey jean jacket with a collared neckline and a button front. The washed finish adds contrast over a solid-colour top."],
  ["Brown Shearling", "A brown jacket with a light contrast collar and a zip front. The two tones give it definition over a dark base layer."],
  ["Tan Trench", "A belted tan trench with a wide lapel and long silhouette. Tie the belt at the waist or wear the coat open over simple layers."],
  ["Blue Tanktop", "A blue-green cropped top with narrow straps. Pair it with a high-rise bottom or wear it as a layer under an open shirt."],
  ["Floral Blouse", "A light floral blouse with an off-shoulder neckline. The gathered sleeves give the print a soft, relaxed shape."],
  ["Floral Dress", "A light floral dress with a wrap-style front. The pale ground and scattered print keep the look easy to pair with neutral accessories."],
  ["Red Dots Dress", "A red dress with a small white dot pattern and a tied waist. The print gives the piece enough detail to style with simple shoes."],
  ["Striped Sweater", "A sweater with broad brown and white stripes and a high neckline. The bold pattern works with plain trousers or a simple skirt."],
  ["Yellow Track Suit", "A bright yellow track set with a hooded top and matching trousers. Wear the pieces together or pair one with a neutral separate."],
  ["White Blouse", "A white sleeveless blouse with an open neckline. Its simple shape leaves room for layered jewellery or a jacket."],
  ["Camo Down Vest", "A dark camouflage vest with a raised collar and a zip front. Use it as an outer layer over a contrasting long sleeve."],
  ["Floral T-shirt", "A short-sleeve floral top with a blue ground and warm-toned print. The pattern pairs well with a solid-colour bottom."],
  ["Black & White Longsleeve", "A black and white top with contrasting sleeves. The two-tone design works with dark jeans or casual trousers."],
  ["Pink T-shirt", "A pale pink short-sleeve top with a scattered print. Keep the rest of the outfit simple to bring out the pattern."],
  ["Jean Long Sleeve", "A blue collared shirt with a button front and sleeves shown rolled up. Try it open over a tee or buttoned on its own."],
  ["Burgundy T-shirt", "A deep burgundy short-sleeve top with a small scattered pattern. It pairs easily with dark trousers or lighter denim."],
]);

const visualDetails = new Map([
  ["Green Beanie", { colour: "Forest green", style: "Ribbed beanie with a folded cuff" }],
  ["Black Converse", { colour: "Black", style: "Lace-up high-top" }],
  ["Nike White AirForce", { colour: "White", style: "Lace-up high-top" }],
  ["Tan Trench", { colour: "Tan", style: "Belted longline coat" }],
  ["Striped Sweater", { colour: "Brown and white", style: "High-neck striped sweater" }],
]);

const sizingTips = new Map([
  ["hats", "Measure around your head just above your eyebrows and ears. Compare that measurement with the size guide for the style you intend to wear."],
  ["sneakers", "Measure both feet in the socks you would wear with the shoes. Use the longer measurement when comparing it with the brand’s size chart."],
  ["jackets", "Compare the shoulders and sleeve length with a jacket you already wear. Leave room for the layers you plan to wear underneath."],
  ["womens", "Use a piece you already wear as a reference for the length and shape you prefer. Take your body measurements before consulting a size chart."],
  ["mens", "Compare the chest width and length with a top you already wear. Measure it laid flat to keep the comparison consistent."],
]);

export const getProductDetailCopy = (product) => ({
  description: typeof product.description === "string" && product.description.trim()
    ? product.description.trim()
    : productDescriptions.get(product.name),
  details: visualDetails.get(product.name),
  sizing: sizingTips.get(product.category),
});
