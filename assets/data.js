/* =========================================================
   COMMINT BUKA — shared catalogue data (used by every page)
   Photos are square crops in /images. Sources (free licences, Pexels / Unsplash):
     jollof 30246915 · friedrice bEUZfy7m-NU · amala 37648018 · egusi 0A03YQqU4CU
     poundedyam kn_ANxnwCQ0 · puffpuff _y325luZNUs · suya 11112700 · dodo 27556971
     zobo 32566391 · zobojar 34481088 · peppersoup 34618920 · box 37324427
     jollofsuya woC24wGXsQ8 · ricestew 3gbiqiGJYUc · about 36707708
   DEMO PLACEHOLDERS: branch addresses, phone numbers, delivery fees, bank
   account and reviews are made up for the prototype.
   ========================================================= */
const STORE = {
  name:"Commint Buka", logo:"CB", email:"hello@commintbuka.ng", phone:"+234 801 234 5600",
  bank:{ bank:"Providus Bank", name:"Commint Buka Foods Ltd", number:"9900112233" }
};

const HOURS_STD = [["Sunday","12pm – 9pm"],["Monday","8am – 10pm"],["Tuesday","8am – 10pm"],["Wednesday","8am – 10pm"],["Thursday","8am – 10pm"],["Friday","8am – 11pm"],["Saturday","9am – 11pm"]];

/* default delivery zones — management can edit these per branch in the dashboard */
const BRANCHES = [
  { id:"allen", code:"AL", name:"Allen", address:"24 Allen Avenue, Ikeja, Lagos", phone:"+234 801 234 5601",
    hours:HOURS_STD,
    zones:[ {area:"Allen Avenue", fee:800, eta:"20–30 min"}, {area:"Opebi", fee:1000, eta:"25–35 min"},
            {area:"Alausa", fee:1200, eta:"30–40 min"}, {area:"Ogba", fee:1800, eta:"40–55 min"},
            {area:"Maryland", fee:2000, eta:"45–60 min"} ] },
  { id:"ikeja", code:"IK", name:"Ikeja", address:"8 Isaac John Street, Ikeja GRA, Lagos", phone:"+234 801 234 5602",
    hours:[["Sunday","12pm – 9pm"],["Monday","7am – 10pm"],["Tuesday","7am – 10pm"],["Wednesday","7am – 10pm"],["Thursday","7am – 10pm"],["Friday","7am – 11pm"],["Saturday","8am – 11pm"]],
    zones:[ {area:"Ikeja GRA", fee:800, eta:"20–30 min"}, {area:"Oregun", fee:1000, eta:"25–35 min"},
            {area:"Agidingbi", fee:1200, eta:"30–40 min"}, {area:"Ojodu", fee:1800, eta:"40–55 min"},
            {area:"Magodo", fee:2000, eta:"45–60 min"} ] }
];

/* reusable option groups (type "one" = pick one, "many" = pick any) */
const OPT = {
  protein:{ name:"Choose your protein", type:"one", items:[["Chicken",0],["Beef",0],["Turkey",1500],["Fish",1000]] },
  riceExtras:{ name:"Add extras", type:"many", items:[["Dodo",800],["Moi moi",700],["Coleslaw",500],["Extra chicken",2000]] },
  spice:{ name:"Spice level", type:"one", items:[["Mild",0],["Normal",0],["Hot",0]] },
  swallow:{ name:"Choose your swallow", type:"one", items:[["Pounded yam",0],["Eba",0],["Semo",0],["Amala",0]] },
  meat:{ name:"Add more meat", type:"many", items:[["Extra beef",1000],["Ponmo",500],["Shaki",700],["Fish",1500]] },
  pieces:{ name:"Portion", type:"one", items:[["10 pieces",0],["20 pieces",1300]] },
  sticks:{ name:"Portion", type:"one", items:[["1 stick",0],["3 sticks",5500]] },
  chill:{ name:"Serve", type:"one", items:[["Chilled",0],["With ice",0]] }
};

const CATS = ["All","Rice","Swallow & Soups","Grills","Sides & Small Chops","Drinks","Combos"];

/* base menu — prices/availability can be overridden per branch (see Store.applyBranch) */
const MENU = [
  { id:"jollof", name:"Jollof Rice & Chicken", short:"Jollof rice & chicken", cat:"Rice", price:4500, img:"images/jollof.jpg",
    l1:"JOLLOF RICE &", l2:"CHICKEN", score:4.9, reviews:1248, time:"20 min", tag:"Best seller",
    desc:"Smoky party jollof with grilled chicken and mixed veg.",
    review:"Smoky, party-style jollof with that bottom-pot flavour, and grilled chicken charred just right. E choke!",
    ingredients:["Long-grain parboiled rice","Tomato, tatashe & scotch bonnet","Grilled chicken thighs","Bay leaf & curry","Mixed veg & sweetcorn"],
    opts:["protein","riceExtras","spice"] },
  { id:"friedrice", name:"Fried Rice & Chicken", short:"Fried rice & chicken", cat:"Rice", price:4500, img:"images/friedrice.jpg",
    l1:"FRIED RICE &", l2:"CHICKEN", score:4.6, reviews:932, time:"20 min",
    desc:"Curry-yellow fried rice with sweetcorn, peas and chicken.",
    review:"Fluffy curry-yellow grains, sweetcorn, peas and tender chicken. The fried rice that disappears first at every party.",
    ingredients:["Parboiled rice","Chicken stock & curry","Diced chicken & liver","Carrots, peas & sweetcorn","Spring onion"],
    opts:["protein","riceExtras"] },
  { id:"jollofsuya", name:"Jollof & Chicken Skewers", cat:"Rice", price:5200, img:"images/jollofsuya.jpg", score:4.7, reviews:402, time:"25 min", tag:"New",
    desc:"Party jollof topped with peppered chicken and bell pepper skewers.", opts:["riceExtras","spice"] },
  { id:"ricestew", name:"White Rice & Seafood Stew", cat:"Rice", price:6500, img:"images/ricestew.jpg", score:4.6, reviews:288, time:"25 min",
    desc:"Fluffy white rice, rich pepper stew with prawns, okra and garden egg.", opts:["riceExtras","spice"] },
  { id:"amala", name:"Amala & Ewedu", short:"Amala & ewedu", cat:"Swallow & Soups", price:3800, img:"images/amala.jpg",
    l1:"AMALA &", l2:"EWEDU", score:4.8, reviews:1105, time:"15 min", tag:"Local fave",
    desc:"Soft amala with ewedu, gbegiri and peppery stew with assorted meat.",
    review:"Silky ewedu, rich gbegiri and peppery stew over assorted meat, with soft, hot amala. Pure Ibadan comfort.",
    ingredients:["Yam flour (elubo) amala","Ewedu (jute leaves)","Gbegiri bean soup","Obe ata stew","Assorted meat & shaki"],
    opts:["meat","spice"] },
  { id:"egusi", name:"Egusi Soup (Assorted)", short:"Egusi soup", cat:"Swallow & Soups", price:5200, img:"images/egusi.jpg",
    l1:"ASSORTED MEAT", l2:"EGUSI", score:4.7, reviews:864, time:"25 min",
    desc:"Fried egusi in palm oil with shaki, cow foot and kidney. Choose your swallow.",
    review:"Fried egusi curds in palm oil, loaded with shaki, cow foot and kidney. Bring your pounded yam and clear your evening.",
    ingredients:["Ground melon seeds","Palm oil","Shaki, cow foot & kidney","Stockfish & crayfish","Bitter leaf / ugwu"],
    opts:["swallow","meat"] },
  { id:"poundedyam", name:"Pounded Yam & Efo Riro", short:"Pounded yam & efo", cat:"Swallow & Soups", price:4800, img:"images/poundedyam.jpg",
    l1:"POUNDED YAM &", l2:"EFO RIRO", score:4.5, reviews:618, time:"25 min",
    desc:"Stretchy iyan with rich efo riro, iru and smoked fish.",
    review:"Stretchy, lump-free iyan with a rich efo riro full of iru and locust-bean aroma. Heavy in the best way.",
    ingredients:["Puna yam","Efo tete (spinach)","Iru (locust beans)","Tatashe & scotch bonnet","Smoked fish & ponmo"],
    opts:["meat"] },
  { id:"peppersoup", name:"Goat Meat Pepper Soup", cat:"Swallow & Soups", price:4000, img:"images/peppersoup.jpg", score:4.6, reviews:356, time:"20 min",
    desc:"Hot, peppery goat meat broth with uziza and scent leaf.", opts:["spice"] },
  { id:"suya", name:"Beef Suya", cat:"Grills", price:3000, img:"images/suya.jpg", score:4.8, reviews:710, time:"15 min", tag:"Spicy",
    desc:"Charcoal-grilled beef in yaji spice, with onions and tomatoes.", opts:["sticks","spice"] },
  { id:"box", name:"Chicken, Dodo & Yam Box", cat:"Grills", price:5500, img:"images/box.jpg", score:4.7, reviews:390, time:"20 min",
    desc:"Fried chicken, peppered beef, dodo and fried yam in one box.", opts:["spice"] },
  { id:"dodo", name:"Fried Plantain (Dodo)", cat:"Sides & Small Chops", price:1500, img:"images/dodo.jpg", score:4.8, reviews:820, time:"10 min",
    desc:"Sweet, ripe plantain fried golden.", opts:[] },
  { id:"puffpuff", name:"Puff-Puff", short:"Puff-puff", cat:"Sides & Small Chops", price:1500, img:"images/puffpuff.jpg",
    l1:"SWEET", l2:"PUFF-PUFF", score:4.4, reviews:540, time:"10 min",
    desc:"Golden, airy and just sweet enough.",
    review:"Golden outside, airy inside, just sweet enough. Nobody has ever eaten just one.",
    ingredients:["Flour","Yeast","Sugar","Nutmeg","Warm water"], opts:["pieces"] },
  { id:"zobo", name:"Chilled Zobo", cat:"Drinks", price:1000, img:"images/zobo.jpg", score:4.7, reviews:640, time:"2 min",
    desc:"Hibiscus with ginger, pineapple and cloves. 50cl.", opts:["chill"] },
  { id:"zobojar", name:"Zobo 1L Jar", cat:"Drinks", price:2500, img:"images/zobojar.jpg", score:4.8, reviews:215, time:"2 min",
    desc:"A full litre of our house zobo to share, or not.", opts:[] },
  /* combos */
  { id:"c-lunch", name:"Lunch Deal", cat:"Combos", price:5000, was:5500, img:"images/friedrice.jpg", score:4.7, reviews:310, time:"20 min",
    desc:"Fried rice & chicken, dodo and a chilled zobo.", opts:["protein"] },
  { id:"c-box", name:"Chop Box for Two", cat:"Combos", price:9500, was:11000, img:"images/box.jpg", score:4.8, reviews:198, time:"25 min",
    desc:"2 chicken, peppered beef, dodo, yam and 2 zobos.", opts:["spice"] },
  { id:"c-party", name:"Jollof Party Pack", cat:"Combos", price:16000, was:19000, img:"images/jollof.jpg", score:4.9, reviews:156, time:"40 min",
    desc:"Jollof for 4, 4 chicken, dodo, coleslaw and a 1L zobo.", opts:["spice"] }
];
MENU.forEach(m => { m.base = m.price; });

/* the 6 dishes on today's menu in the hero */
const TODAY = ["jollof","friedrice","amala","egusi","poundedyam","puffpuff"];
const byId = id => MENU.find(m => m.id === id);
const dishes = TODAY.map(byId);

const REVIEWS = [
  { name:"Tolu A.", when:"2 days ago", score:5, color:"#c2185b", dish:"Jollof Rice & Chicken",
    text:"Ordered at 1pm, it was at my office by 1:35 and still hot. The jollof has that real party smoke. Finally a buka that does delivery properly." },
  { name:"Chidi O.", when:"1 week ago", score:5, color:"#353537", dish:"Egusi Soup (Assorted)",
    text:"The egusi is loaded. Shaki, cow foot, kidney, the works. Pounded yam was smooth with no lumps. My new Friday spot." },
  { name:"Amaka E.", when:"2 weeks ago", score:4, color:"#6b4a2f", dish:"Chop Box for Two",
    text:"Great value for two people. Chicken was crunchy and well spiced. Would love a bit more dodo, but I'm not complaining." },
  { name:"Seun B.", when:"3 weeks ago", score:5, color:"#2e7d5b", dish:"Amala & Ewedu",
    text:"Amala was soft and hot, gbegiri and ewedu on point. Tastes exactly like Ibadan. Ordering was fast and easy too." }
];

const naira = v => "₦" + Math.round(v).toLocaleString("en-NG");
