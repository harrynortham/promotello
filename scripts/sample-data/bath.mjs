// A second city's worth of sample data, for checking that the customer pages
// adapt when Promotello is live in more than one place. Bath is the obvious
// neighbour to Bristol: close enough that one city's radius nearly reaches
// the other, and it brings outlying towns (Keynsham, Saltford) with it.
//
// Names are invented. Addresses use real streets without house numbers so a
// listing never points at a real business. Photos are Unsplash photo IDs.

// Deliberate choices worth keeping, because each one is a test:
//  - "City Centre" exists in Bristol too, so area names are not unique
//    across cities.
//  - Walcot, Weston and Bathwick have no businesses, so an area can be
//    offered in search and have nothing behind it.
//  - Keynsham and Saltford are towns, not Bath neighbourhoods, and sit in
//    the BS31 district rather than BA1/BA2.
const areas = {
    cityCentre: { region: "City Centre", postal_code: "BA1 1EN", latitude: 51.3813, longitude: -2.3590 },
    widcombe: { region: "Widcombe", postal_code: "BA2 6AA", latitude: 51.3765, longitude: -2.3528 },
    bearFlat: { region: "Bear Flat", postal_code: "BA2 4EN", latitude: 51.3725, longitude: -2.3639 },
    larkhall: { region: "Larkhall", postal_code: "BA1 6RL", latitude: 51.3918, longitude: -2.3451 },
    oldfieldPark: { region: "Oldfield Park", postal_code: "BA2 3LQ", latitude: 51.3757, longitude: -2.3786 },
    combeDown: { region: "Combe Down", postal_code: "BA2 5HP", latitude: 51.3604, longitude: -2.3503 },
    keynsham: { region: "Keynsham", postal_code: "BS31 1DS", latitude: 51.4142, longitude: -2.4986 },
    saltford: { region: "Saltford", postal_code: "BS31 3BN", latitude: 51.4028, longitude: -2.4489 },
};

// [opens, closes] per day, Sunday first; null means closed.
const hours = {
    cafe: [["08:30", "16:00"], ["08:00", "17:00"], ["08:00", "17:00"], ["08:00", "17:00"], ["08:00", "17:00"], ["08:00", "17:00"], ["08:30", "17:00"]],
    shop: [["11:00", "16:00"], ["09:30", "17:30"], ["09:30", "17:30"], ["09:30", "17:30"], ["09:30", "17:30"], ["09:30", "17:30"], ["09:00", "17:30"]],
    salon: [null, null, ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "20:00"], ["09:00", "18:00"], ["08:30", "17:00"]],
    leisure: [["08:00", "19:00"], ["06:30", "21:00"], ["06:30", "21:00"], ["06:30", "21:00"], ["06:30", "21:00"], ["06:30", "20:00"], ["08:00", "18:00"]],
    workshop: [null, ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], ["10:00", "16:00"]],
    stay: [["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"], ["07:00", "22:00"]],
};

export const bathCity = {
    name: "Bath",
    slug: "bath",
    // BS31 is Keynsham and Saltford: the same two letters as Bristol's
    // districts, which is worth having in the data.
    postcodeDistricts: ["BA1", "BA2", "BS31"],
    latitude: 51.3811,
    longitude: -2.359,
    radiusKm: 12,
    // Left empty on purpose: a newly added city has no photos of its own.
    heroImageUrl: null,
    featureImageUrl: null,
    // Three of these have no businesses, which is the point.
    areas: [
        "City Centre",
        "Widcombe",
        "Bear Flat",
        "Larkhall",
        "Oldfield Park",
        "Combe Down",
        "Keynsham",
        "Saltford",
        "Walcot",
        "Weston",
        "Bathwick",
    ],
};

export const bathBusinesses = [
    {
        name: "The Pulteney Press",
        loyalty: { stampsRequired: 7, reward: "A free coffee and a slice of cake" },
        category: "cafes-coffee",
        description: "A coffee house in a Georgian basement off the bridge, pulling espresso on a lever machine and serving cake baked that morning.",
        street: "Argyle Street", area: areas.cityCentre, hours: hours.cafe,
        logo: { color: "#2F4858", accent: "#F4E3C1" },
        offers: [
            { title: "Free cake with any coffee before 11am", discount: "Free cake", description: "Any espresso drink before 11am comes with a slice from the counter, on us.", availability: "Weekdays before 11am", photo: "N76Cadq2wQs", maxRedemptions: 120 },
            { title: "25% off whole beans", discount: "25% off", description: "Take home 250g of our house blend or a single origin filter roast, a quarter off.", availability: "While stocks last", photo: "TD4DBagg2wE", maxRedemptions: 50 },
        ],
    },
    {
        name: "Widcombe Wholefoods",
        loyalty: null,
        category: "delis-grocers",
        description: "A refill shop and deli on the parade: loose grains and pulses, local cheese, and bread delivered twice a week.",
        street: "Widcombe Parade", area: areas.widcombe, hours: hours.shop,
        logo: { color: "#4F6F52", accent: "#F3F0E3" },
        offers: [
            { title: "15% off your first refill", discount: "15% off", description: "Bring your own container and take 15% off everything you fill on your first visit.", availability: "First visit only", photo: "MQUqbmszGGM" },
        ],
    },
    {
        name: "Bear Flat Barbers",
        loyalty: { stampsRequired: 6, reward: "A free cut" },
        category: "hair-barbers",
        description: "A two-chair barbershop at the top of the hill. Walk in for a skin fade or book ahead for a hot-towel shave.",
        street: "Bruton Avenue", area: areas.bearFlat, hours: hours.salon,
        logo: { color: "#1F2A38", accent: "#E4B363" },
        offers: [
            { title: "£5 off a cut and beard trim", discount: "£5 off", description: "A full cut with a beard tidy and hot towel finish, five pounds off the usual price.", availability: "Tuesday to Thursday", photo: "vt0O0Av96R4" },
        ],
    },
    {
        name: "Larkhall Lido",
        loyalty: { stampsRequired: 10, reward: "A free swim" },
        category: "fitness-sport",
        description: "A heated outdoor pool kept open all year, with a sauna, a small gym and a cafe hatch for after your swim.",
        street: "St Saviours Road", area: areas.larkhall, hours: hours.leisure,
        logo: { color: "#1B6CA8", accent: "#EAF4FB" },
        offers: [
            { title: "Two swims for the price of one", discount: "2 for 1", description: "Bring someone with you on a weekday morning and only pay for one swim.", availability: "Weekdays before noon", photo: "uNNlbCrrcXk", maxRedemptions: 200 },
            { title: "First month of membership half price", discount: "50% off", description: "Join on a rolling monthly membership and the first month is half price, sauna included.", availability: "New members", photo: "fEVaiLwWvlU", maxRedemptions: 30 },
        ],
    },
    {
        name: "Oldfield Bindery",
        loyalty: null,
        category: "books-music",
        description: "Secondhand books downstairs and a working bindery upstairs, repairing spines and making notebooks to order.",
        street: "Moorland Road", area: areas.oldfieldPark, hours: hours.shop,
        logo: { color: "#6B3F2B", accent: "#F6ECD9" },
        offers: [
            { title: "Three secondhand paperbacks for £10", discount: "3 for £10", description: "Any three paperbacks from the shelves at the front of the shop for a tenner.", availability: "Any time", photo: "q58p3oxqY0Q" },
        ],
    },
    {
        name: "Keynsham Cycle Works",
        loyalty: { stampsRequired: 5, reward: "A free full service" },
        category: "bike-repair",
        description: "A workshop by the station doing same-day repairs, wheel builds and winter servicing, with a loan bike while yours is in.",
        street: "Temple Street", area: areas.keynsham, hours: hours.workshop,
        logo: { color: "#243B53", accent: "#F0B429" },
        offers: [
            { title: "Free safety check with any repair", discount: "Free check", description: "Any repair booked in comes with a twenty-point safety check and a chain clean.", availability: "Any time", photo: "Tnpd6TB6uN0" },
            { title: "20% off a winter service", discount: "20% off", description: "Cables, brakes, gears and a full clean, ready for the wet months.", availability: "Until the end of winter", photo: "CMt1rgM5Y0I", maxRedemptions: 60 },
        ],
    },
    {
        name: "Saltford Mill Rooms",
        loyalty: null,
        category: "hotels-bnbs",
        description: "Five rooms in a converted brass mill on the river between Bath and Bristol, with breakfast in the old wheelhouse.",
        street: "Mill Lane", area: areas.saltford, hours: hours.stay,
        logo: { color: "#3C4F3D", accent: "#EFE6D3" },
        offers: [
            { title: "Third night free on a midweek stay", discount: "3rd night free", description: "Book two midweek nights and the third is on us, breakfast included throughout.", availability: "Sunday to Thursday", photo: "rPG-sZpJHQA", maxRedemptions: 20 },
        ],
    },
    {
        name: "Combe Down Clay",
        loyalty: null,
        category: "classes-workshops",
        description: "A pottery studio in the old stone yard running beginners' wheel evenings and weekend throwing days.",
        street: "Combe Road", area: areas.combeDown, hours: hours.workshop,
        logo: { color: "#8C5E58", accent: "#F7EDE2" },
        offers: [
            { title: "£10 off a beginners' wheel evening", discount: "£10 off", description: "Three hours on the wheel with clay, firing and a glass of wine included.", availability: "Thursday evenings", photo: "LpK2xddrElI", maxRedemptions: 40 },
        ],
    },
];
