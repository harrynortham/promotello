// Fictional Bristol businesses used to populate the site before launch.
// Names are invented. Addresses use real streets without house numbers so a
// listing never points at a real shop. Photos are Unsplash photo IDs
// (unsplash.com/photos/<id>), all under the Unsplash License.

const areas = {
    harbourside: { region: "Harbourside", postal_code: "BS1", latitude: 51.4497, longitude: -2.5986 },
    stokesCroft: { region: "Stokes Croft", postal_code: "BS1", latitude: 51.4632, longitude: -2.5893 },
    gloucesterRoad: { region: "Gloucester Road", postal_code: "BS7", latitude: 51.4761, longitude: -2.5902 },
    bishopston: { region: "Bishopston", postal_code: "BS7", latitude: 51.4802, longitude: -2.5879 },
    clifton: { region: "Clifton", postal_code: "BS8", latitude: 51.4561, longitude: -2.6199 },
    cotham: { region: "Cotham", postal_code: "BS6", latitude: 51.4641, longitude: -2.6003 },
    redland: { region: "Redland", postal_code: "BS6", latitude: 51.4719, longitude: -2.6052 },
    montpelier: { region: "Montpelier", postal_code: "BS6", latitude: 51.4672, longitude: -2.5868 },
    kingsdown: { region: "Kingsdown", postal_code: "BS2", latitude: 51.4623, longitude: -2.5939 },
    oldMarket: { region: "Old Market", postal_code: "BS2", latitude: 51.4561, longitude: -2.5806 },
    stPhilips: { region: "St Philips", postal_code: "BS2", latitude: 51.4519, longitude: -2.5731 },
    easton: { region: "Easton", postal_code: "BS5", latitude: 51.4631, longitude: -2.5652 },
    bedminster: { region: "Bedminster", postal_code: "BS3", latitude: 51.4402, longitude: -2.6003 },
    southville: { region: "Southville", postal_code: "BS3", latitude: 51.4433, longitude: -2.6048 },
    fishponds: { region: "Fishponds", postal_code: "BS16", latitude: 51.4803, longitude: -2.5302 },
};

// [opens, closes] per day, Sunday first; null means closed.
const hours = {
    cafe: [["08:00", "16:00"], ["07:30", "17:00"], ["07:30", "17:00"], ["07:30", "17:00"], ["07:30", "17:00"], ["07:30", "17:00"], ["08:00", "17:00"]],
    bakery: [["08:00", "14:00"], null, ["07:30", "16:00"], ["07:30", "16:00"], ["07:30", "16:00"], ["07:30", "16:00"], ["07:30", "15:00"]],
    restaurant: [["12:00", "21:00"], null, ["17:00", "22:00"], ["17:00", "22:00"], ["17:00", "22:00"], ["12:00", "23:00"], ["12:00", "23:00"]],
    bar: [["12:00", "22:00"], ["16:00", "23:00"], ["16:00", "23:00"], ["16:00", "23:00"], ["16:00", "23:00"], ["12:00", "23:30"], ["12:00", "23:30"]],
    leisure: [["10:00", "20:00"], ["12:00", "22:00"], ["12:00", "22:00"], ["12:00", "22:00"], ["12:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"]],
    shop: [["11:00", "16:00"], ["10:00", "18:00"], ["10:00", "18:00"], ["10:00", "18:00"], ["10:00", "18:00"], ["10:00", "18:00"], ["09:30", "18:00"]],
    salon: [null, null, ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "20:00"], ["09:00", "18:00"], ["09:00", "17:00"]],
    studio: [["09:00", "13:00"], ["07:00", "21:00"], ["07:00", "21:00"], ["07:00", "21:00"], ["07:00", "21:00"], ["07:00", "19:00"], ["08:00", "14:00"]],
    workshop: [null, ["08:30", "17:30"], ["08:30", "17:30"], ["08:30", "17:30"], ["08:30", "17:30"], ["08:30", "17:30"], ["09:00", "16:00"]],
    stay: [["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"]],
};

export const sampleBusinesses = [
    // Food & drink
    {
        name: "Harbour Grind",
        category: "cafes-coffee",
        description: "A small-batch roastery and café on the water, roasting beans on site every Tuesday. Expect flat whites, seasonal filter coffee and pastries from the bakery up the road.",
        street: "Narrow Quay", area: areas.harbourside, hours: hours.cafe,
        website_url: null, logo: { color: "#3B2A20", accent: "#E8C9A0" },
        offers: [
            { title: "Free pastry with any hot drink before 10am", discount: "Free pastry", description: "Start the day right: grab any coffee or tea before 10am and choose a pastry from the counter on us.", availability: "Weekdays before 10am", photo: "N76Cadq2wQs", maxRedemptions: 150 },
            { title: "Half-price bags of house beans", discount: "50% off", description: "Take home a 250g bag of our house espresso or seasonal filter roast for half the usual price.", availability: "While stocks last", photo: "TD4DBagg2wE", maxRedemptions: 40 },
        ],
    },
    {
        name: "Little Loaf",
        category: "bakeries",
        description: "A neighbourhood bakery baking sourdough, focaccia and cinnamon buns from 5am. Loaves usually sell out by lunchtime on Saturdays.",
        street: "Gloucester Road", area: areas.gloucesterRoad, hours: hours.bakery,
        logo: { color: "#C8553D", accent: "#FFF1E0" },
        offers: [
            { title: "20% off sourdough loaves", discount: "20% off", description: "Our country sourdough, seeded rye and spelt loaves, all 20% off when you show your code at the till.", availability: "Tuesday to Friday", photo: "3BTqX4NJqXg" },
            { title: "Free cinnamon bun with any coffee", discount: "Free bun", description: "Buy any coffee and get one of our cardamom-spiced cinnamon buns free.", availability: "Saturdays", photo: "n49BjsFf5dI", maxRedemptions: 100 },
        ],
    },
    {
        name: "Forno Rosso",
        category: "restaurants",
        description: "Neapolitan-style pizza from a wood-fired oven, with a short list of natural wines and house-made tiramisu.",
        street: "Stokes Croft", area: areas.stokesCroft, hours: hours.restaurant,
        logo: { color: "#B3261E", accent: "#FFE7C2" },
        offers: [
            { title: "Two pizzas for £20, Tuesday to Thursday", discount: "2 for £20", description: "Any two pizzas from the main menu for £20, eat in or takeaway.", availability: "Tuesday to Thursday evenings", photo: "MQUqbmszGGM" },
            { title: "Free garlic bread with any order", discount: "Free side", description: "Add our wood-fired garlic bread to any order at no extra cost.", availability: "Any time we're open", photo: "L_xJ6LzGrv8" },
        ],
    },
    {
        name: "Tidewater Taproom",
        category: "pubs-bars",
        description: "An independent brewery taproom with twelve lines of house and guest beers, board games behind the bar and a dog-friendly beer garden.",
        street: "North Street", area: areas.bedminster, hours: hours.bar,
        logo: { color: "#1F4E5F", accent: "#F4C95D" },
        offers: [
            { title: "£1 off every pint, 5pm to 7pm", discount: "£1 off pints", description: "Our happy hour on every draught beer, including guest lines.", availability: "Monday to Friday, 5pm to 7pm", photo: "VJXLzQi5TlE" },
            { title: "Tasting flight of four beers for £8", discount: "Flight for £8", description: "Four third-pints of your choice from the current tap list, served on a paddle.", availability: "Any time", photo: "vt0O0Av96R4" },
        ],
    },
    {
        name: "Scoop Theory",
        category: "ice-cream-desserts",
        description: "Small-batch gelato made every morning with milk from a Somerset dairy. Around sixteen flavours, always two vegan.",
        street: "Princess Victoria Street", area: areas.clifton, hours: hours.cafe,
        logo: { color: "#E07A9A", accent: "#FFF6E9" },
        offers: [
            { title: "Second scoop free", discount: "Free scoop", description: "Order a single scoop in a cup or cone and we'll add a second flavour on the house.", availability: "Monday to Thursday", photo: "xewRy41D0TM", maxRedemptions: 200 },
            { title: "Kids' cones for £1 on Sundays", discount: "£1 cones", description: "Any single-scoop kids' cone for £1 every Sunday.", availability: "Sundays", photo: "zbABzsqek9k" },
        ],
    },

    // Things to do
    {
        name: "Granite & Grip",
        category: "fitness-sport",
        description: "A bouldering centre with over 200 problems reset every week, a kids' wall, a training area and a café upstairs.",
        street: "Feeder Road", area: areas.stPhilips, hours: hours.leisure,
        logo: { color: "#2E3A59", accent: "#9BE15D" },
        offers: [
            { title: "Half-price first visit", discount: "50% off", description: "New to Granite & Grip? Your first session is half price, including a short safety induction.", availability: "First visit only", photo: "NY1D4Zni7fc" },
            { title: "Free shoe hire with any session", discount: "Free shoe hire", description: "Climbing shoes and chalk included with any day pass.", availability: "Weekdays", photo: "2qK9YbtIrc8" },
        ],
    },
    {
        name: "Lockbox Escape Rooms",
        category: "activities-experiences",
        description: "Three escape rooms built in an old print works, for groups of two to six. Most teams get out with seconds to spare.",
        street: "West Street", area: areas.oldMarket, hours: hours.leisure,
        logo: { color: "#141414", accent: "#FF593F" },
        offers: [
            { title: "£5 off per player, Monday to Thursday", discount: "£5 off pp", description: "Book any room Monday to Thursday and save £5 for every player in your team.", availability: "Monday to Thursday", photo: "j5s1BcYQ_iA" },
        ],
    },
    {
        name: "The Reel Room",
        category: "cinema-theatre",
        description: "A 40-seat independent cinema showing new releases, cult classics and a monthly silent film with live piano.",
        street: "North Street", area: areas.southville, hours: hours.leisure,
        logo: { color: "#7A1F2B", accent: "#F2D16B" },
        offers: [
            { title: "Two tickets and a popcorn for £15", discount: "2 for £15", description: "Two standard tickets plus a sharing popcorn for £15 at any screening.", availability: "Sunday to Thursday", photo: "L70rE9UChmI" },
            { title: "Student tickets £5 on Wednesdays", discount: "£5 tickets", description: "Show a valid student card for £5 tickets to every Wednesday screening.", availability: "Wednesdays", photo: "uNNlbCrrcXk" },
        ],
    },

    // Shopping
    {
        name: "Second Spin Records",
        category: "books-music",
        description: "New and second-hand vinyl, with a soft spot for soul, dub and Bristol's own sound. Listening decks at the back.",
        street: "Stokes Croft", area: areas.stokesCroft, hours: hours.shop,
        logo: { color: "#22223B", accent: "#F9C74F" },
        offers: [
            { title: "10% off all new vinyl", discount: "10% off", description: "Take 10% off any new LP or 12\" in the shop.", availability: "Any time", photo: "fEVaiLwWvlU" },
            { title: "Free tote bag when you spend £30", discount: "Free tote", description: "Spend £30 or more and take home a Second Spin canvas tote.", availability: "While stocks last", photo: "tt9aoYxQeBU", maxRedemptions: 60 },
        ],
    },
    {
        name: "Fern & Fig",
        category: "plants-flowers",
        description: "A plant shop full of houseplants, terracotta and hanging planters, with free care advice for anything you buy.",
        street: "Picton Street", area: areas.montpelier, hours: hours.shop,
        logo: { color: "#2D6A4F", accent: "#D8F3DC" },
        offers: [
            { title: "15% off houseplants", discount: "15% off", description: "Fifteen percent off every houseplant in store, from pothos to fiddle-leaf figs.", availability: "Any time", photo: "dDVU6D_6T80" },
            { title: "Free repotting with any pot", discount: "Free repotting", description: "Buy a pot from us and we'll repot your plant into it for free while you wait.", availability: "Weekdays", photo: "uncOUgjCm80" },
        ],
    },
    {
        name: "Loop Vintage",
        category: "fashion-vintage",
        description: "Hand-picked vintage clothing from the 70s to the 00s, with a repairs rail and new stock every Thursday.",
        street: "Gloucester Road", area: areas.gloucesterRoad, hours: hours.shop,
        logo: { color: "#6D597A", accent: "#FFCDB2" },
        offers: [
            { title: "20% off all denim", discount: "20% off", description: "Jeans, jackets and skirts: everything denim is 20% off.", availability: "Any time", photo: "q58p3oxqY0Q" },
            { title: "Bring three items, get £10 store credit", discount: "£10 credit", description: "Drop off three clean, wearable clothes and we'll give you £10 to spend in store.", availability: "Thursday to Saturday", photo: "mwa_nzFpnJw" },
        ],
    },
    {
        name: "The Folded Page",
        category: "books-music",
        description: "An independent bookshop with a strong fiction table, a children's corner and author events once a month.",
        street: "Cotham Hill", area: areas.cotham, hours: hours.shop,
        logo: { color: "#264653", accent: "#E9C46A" },
        offers: [
            { title: "Buy two books, get a third half price", discount: "3rd half price", description: "Pick any three books and the cheapest is half price.", availability: "Any time", photo: "UbYS5TovKdo" },
            { title: "Free coffee with any book on Saturdays", discount: "Free coffee", description: "Buy any book on a Saturday and we'll make you a coffee to read with.", availability: "Saturdays", photo: "Tnpd6TB6uN0" },
        ],
    },

    // Health & beauty
    {
        name: "Northside Barbers",
        category: "hair-barbers",
        description: "Traditional cuts and skin fades, hot towel shaves and beard trims. Walk-ins welcome, or book online.",
        street: "Gloucester Road", area: areas.bishopston, hours: hours.salon,
        logo: { color: "#1D3557", accent: "#E63946" },
        offers: [
            { title: "£5 off your first cut", discount: "£5 off", description: "First time in the chair? Take £5 off any haircut.", availability: "First visit only", photo: "CMt1rgM5Y0I" },
            { title: "Beard trim for £8 with any haircut", discount: "£8 beard trim", description: "Add a beard shape-up to any haircut for £8.", availability: "Tuesday to Thursday", photo: "1Pmp9uxK8X8" },
        ],
    },
    {
        name: "Still Point Yoga",
        category: "yoga-wellbeing",
        description: "A light-filled studio running vinyasa, yin and beginners' classes, with mats and props provided.",
        street: "Chandos Road", area: areas.redland, hours: hours.studio,
        logo: { color: "#B5838D", accent: "#FFF4E6" },
        offers: [
            { title: "Your first class free", discount: "Free class", description: "Try any class on the timetable for free. Mats and props provided.", availability: "First visit only", photo: "2G2nlUR9VrU" },
            { title: "£15 off a 10-class pass", discount: "£15 off", description: "Save £15 on a 10-class pass, valid for six months.", availability: "Any time", photo: "vpVE1Xk1eR4" },
        ],
    },
    {
        name: "Willow Skin Rooms",
        category: "beauty-nails",
        description: "Facials, massage and skin treatments in two calm treatment rooms. Every first visit includes a skin consultation.",
        street: "North Street", area: areas.southville, hours: hours.salon,
        logo: { color: "#5E6472", accent: "#FAD2E1" },
        offers: [
            { title: "20% off your first facial", discount: "20% off", description: "Twenty percent off any facial on your first visit, including a skin consultation.", availability: "First visit only", photo: "91dmB8SHiWc" },
            { title: "Free hand treatment with any facial", discount: "Free add-on", description: "Add a 15-minute hand and arm massage to any facial at no extra cost.", availability: "Weekdays", photo: "Kq-wYDGo1DU" },
        ],
    },

    // Services
    {
        name: "Spoke & Chain",
        category: "bike-repair",
        description: "A friendly bike workshop doing services, puncture repairs and wheel builds, usually turned around in two days.",
        street: "St Marks Road", area: areas.easton, hours: hours.workshop,
        logo: { color: "#3A5A40", accent: "#FFB703" },
        offers: [
            { title: "Free bike safety check", discount: "Free check", description: "Brakes, gears, tyres and chain checked for free, with no obligation to book a repair.", availability: "Weekdays", photo: "rPG-sZpJHQA" },
            { title: "£10 off a full service", discount: "£10 off", description: "Save £10 on our full service, which covers gears, brakes, bearings and a deep clean.", availability: "Any time", photo: "3eIcZ0yxm2w" },
        ],
    },
    {
        name: "Suds & Snips",
        category: "pet-care",
        description: "A calm, one-dog-at-a-time grooming salon for baths, cuts, nail trims and puppy introductions.",
        street: "Fishponds Road", area: areas.fishponds, hours: hours.salon,
        logo: { color: "#4361EE", accent: "#FFE66D" },
        offers: [
            { title: "15% off your dog's first groom", discount: "15% off", description: "Fifteen percent off any full groom on your dog's first visit.", availability: "First visit only", photo: "LpK2xddrElI" },
        ],
    },

    // Travel & stays
    {
        name: "The Wharf House",
        category: "hotels-bnbs",
        description: "Eight boutique rooms in a converted warehouse on the harbour, a short walk from the city centre and the SS Great Britain.",
        street: "Wapping Road", area: areas.harbourside, hours: hours.stay,
        logo: { color: "#0B3C5D", accent: "#D9B310" },
        offers: [
            { title: "10% off midweek stays", discount: "10% off", description: "Ten percent off any room for stays between Sunday and Thursday night.", availability: "Sunday to Thursday nights", photo: "T5pL6ciEn-I" },
            { title: "Free late checkout", discount: "Free late checkout", description: "Check out at 1pm instead of 11am, at no extra cost.", availability: "Subject to availability", photo: "NIbUk7ATSuw" },
        ],
    },
    {
        name: "The Lantern Rooms",
        category: "hotels-bnbs",
        description: "A Georgian townhouse guesthouse with five rooms and city views, known for its cooked breakfasts.",
        street: "Kingsdown Parade", area: areas.kingsdown, hours: hours.stay,
        logo: { color: "#9C6644", accent: "#FFE8D6" },
        offers: [
            { title: "Breakfast for two included", discount: "Free breakfast", description: "Book any double room and breakfast for two is included.", availability: "Any night", photo: "gtEzYq0B7-A" },
        ],
    },
];
