const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CategoryProduct = require('./src/models/CategoryProduct');
const CategoryShop = require('./src/models/CategoryShop');
const Shop = require('./src/models/Shop');
const Product = require('./src/models/Product');
const User = require('./src/models/User'); // We might need a user for shop owner

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grosserie');
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
};

const categoriesList = [
    { name: 'Vêtements', description: 'Mode et habillement pour tous' },
    { name: 'Électronique', description: 'Gadgets et appareils électroniques' },
    { name: 'Alimentation', description: 'Produits alimentaires et épicerie' },
    { name: 'Maison & Cuisine', description: 'Équipements pour la maison et la cuisine' },
    { name: 'Beauté & Santé', description: 'Produits de soin et de beauté' },
    { name: 'Sports & Loisirs', description: 'Équipements sportifs et loisirs' },
    { name: 'Jouets & Jeux', description: 'Jeux pour enfants et adultes' },
    { name: 'Livres', description: 'Librairie et papeterie' },
    { name: 'Jardin & Bricolage', description: 'Outils et accessoires de jardinage' },
    { name: 'Informatique', description: 'Ordinateurs et périphériques' }
];

const shopsList = [
    {
        name: 'Adidas',
        description: 'Vêtements et chaussures de sport',
        category: 'Vêtements',
        products: [
            { name: 'T-shirt Adidas Originals', price: 120000, description: 'T-shirt en coton confortable' },
            { name: 'Stan Smith', price: 400000, description: 'Chaussures iconiques' },
            { name: 'Ultraboost', price: 600000, description: 'Chaussures de running performantes' },
            { name: 'Pantalon de survêtement', price: 200000, description: 'Confortable pour le sport' },
            { name: 'Veste à capuche', price: 300000, description: 'Veste chaude et stylée' },
            { name: 'Chaussettes (Lot de 3)', price: 50000, description: 'Chaussettes de sport' },
            { name: 'Sac à dos', price: 150000, description: 'Sac pratique pour le sport' },
            { name: 'Casquette', price: 80000, description: 'Casquette ajustable' },
            { name: 'Short de sport', price: 100000, description: 'Short léger et respirant' },
            { name: 'Ballon de football', price: 120000, description: 'Ballon officiel' }
        ]
    },
    {
        name: 'Flow Up',
        description: 'Spécialiste PC Gamer et High-Tech',
        category: 'Informatique',
        products: [
            { name: 'PC Gamer RTX 4060', price: 5000000, description: 'PC puissant pour le gaming' },
            { name: 'Écran 144Hz', price: 1200000, description: 'Moniteur fluide pour jeux' },
            { name: 'Clavier Mécanique', price: 400000, description: 'Clavier RGB switches rouges' },
            { name: 'Souris Gaming', price: 200000, description: 'Souris précise 16000 DPI' },
            { name: 'Casque Gaming', price: 300000, description: 'Casque avec micro et son surround' },
            { name: 'Tapis de souris XXL', price: 80000, description: 'Grand tapis pour clavier et souris' },
            { name: 'Webcam HD', price: 150000, description: 'Pour le streaming' },
            { name: 'Microphone USB', price: 250000, description: 'Micro de qualité studio' },
            { name: 'Chaise Gaming', price: 800000, description: 'Chaise ergonomique confortable' },
            { name: 'Disque SSD 1TB', price: 350000, description: 'Stockage rapide' }
        ]
    },
    {
        name: 'Jumbo Score',
        description: 'Supermarché et alimentation',
        category: 'Alimentation',
        products: [
            { name: 'Riz Blanc (5kg)', price: 25000, description: 'Riz de qualité supérieure' },
            { name: 'Huile de tournesol (1L)', price: 12000, description: 'Huile pour cuisson' },
            { name: 'Pâtes (500g)', price: 4000, description: 'Pâtes italiennes' },
            { name: 'Sucre (1kg)', price: 5000, description: 'Sucre blanc raffiné' },
            { name: 'Lait (1L)', price: 6000, description: 'Lait demi-écrémé' },
            { name: 'Café moulu', price: 15000, description: 'Café arabica' },
            { name: 'Biscuits', price: 3000, description: 'Biscuits au chocolat' },
            { name: 'Jus d\'orange (1L)', price: 8000, description: '100% pur jus' },
            { name: 'Savon', price: 2000, description: 'Savon de toilette' },
            { name: 'Dentifrice', price: 5000, description: 'Protection caries' }
        ]
    },
    {
        name: 'Nike',
        description: 'Just Do It - Sportswear',
        category: 'Sports & Loisirs',
        products: [
            { name: 'Air Jordan 1', price: 700000, description: 'Basket légendaire' },
            { name: 'Air Max 90', price: 600000, description: 'Style et confort' },
            { name: 'T-shirt Dri-Fit', price: 150000, description: 'Évacue la transpiration' },
            { name: 'Short Running', price: 120000, description: 'Idéal pour la course' },
            { name: 'Legging', price: 180000, description: 'Pour le yoga et le fitness' },
            { name: 'Sac de sport', price: 200000, description: 'Grand volume' },
            { name: 'Bandeau', price: 40000, description: 'Accessoire de sport' },
            { name: 'Gourde', price: 50000, description: 'Sans BPA' },
            { name: 'Chaussures de foot', price: 450000, description: 'Crampons pour terrain sec' },
            { name: 'Sweatshirt', price: 350000, description: 'Pull confortable' }
        ]
    },
    {
        name: 'Samsung Store',
        description: 'Leader de l\'électronique',
        category: 'Électronique',
        products: [
            { name: 'Samsung Galaxy S24', price: 4000000, description: 'Dernier smartphone Samsung' },
            { name: 'Galaxy Watch 6', price: 1500000, description: 'Montre connectée' },
            { name: 'Galaxy Buds 2', price: 600000, description: 'Écouteurs sans fil' },
            { name: 'TV QLED 55"', price: 3000000, description: 'Télévision 4K' },
            { name: 'Tablette Galaxy Tab S9', price: 3500000, description: 'Tablette puissante' },
            { name: 'Chargeur Rapide', price: 100000, description: 'Chargeur 45W' },
            { name: 'Coque de protection', price: 80000, description: 'Pour Galaxy S24' },
            { name: 'Carte MicroSD 256GB', price: 150000, description: 'Extension de mémoire' },
            { name: 'Moniteur PC', price: 800000, description: 'Écran bureautique' },
            { name: 'Barre de son', price: 1000000, description: 'Son cinéma' }
        ]
    }
];

const seedData = async () => {
    try {
        await connectDB();

        console.log('🧹 Clearing existing data (Categories, Shops, Products)...');
        await CategoryProduct.deleteMany({});
        await CategoryShop.deleteMany({});
        await Shop.deleteMany({});
        await Product.deleteMany({});

        // Get existing shop users (created by seedUsers.js)
        const shopUsers = await User.find({ role: 'shop' });
        if (shopUsers.length === 0) {
            console.log('⚠️ No shop users found. Please run seedUsers.js first!');
            process.exit(1);
        }
        console.log(`📋 Found ${shopUsers.length} shop users`);

        console.log('🌱 Seeding Categories...');
        const categoryShopMap = {};
        const categoryProductMap = {};

        for (const cat of categoriesList) {
            // Create CategoryShop
            const newShopCat = await CategoryShop.create({
                name: cat.name,
                description: cat.description,
                icon: '🛍️' // Default icon
            });
            categoryShopMap[cat.name] = newShopCat._id;

            // Create CategoryProduct
            const slug = cat.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            const newProdCat = await CategoryProduct.create({
                name: cat.name,
                description: cat.description,
                slug
            });
            categoryProductMap[cat.name] = newProdCat._id;
        }
        console.log(`✅ Categories created (Shop & Product).`);

        // Build shop-user map: lowercase shop name -> user
        const shopUserMap = {};
        shopUsers.forEach(user => {
            const userShopName = user.profile.firstname.toLowerCase().replace(/\s+/g, '');
            shopUserMap[userShopName] = user;
        });

        let shopIndex = 0;
        for (const shopData of shopsList) {
            const shopKey = shopData.name.toLowerCase().replace(/\s+/g, '');
            const shopUser = shopUserMap[shopKey] || shopUsers[shopIndex % shopUsers.length];

            // Create Shop
            const shop = await Shop.create({
                name: shopData.name,
                description: shopData.description,
                category_id: categoryShopMap[shopData.category],
                owner_user_id: shopUser._id,
                rent: { amount: 500, currency: 'MGA' }, // Default rent
                location: { zone: 'A', floor: 1 } // Default location
            });

            console.log(`   🏠 Shop created: ${shop.name} for user ${shopUser.profile.email}`);

            // Update Shop User with shop_id
            shopUser.shop_id = shop._id;
            await shopUser.save();

            shopIndex++;

            // Create Products for this Shop
            const productsToInsert = shopData.products.map(prod => ({
                shop_id: shop._id,
                name: prod.name,
                description: prod.description,
                category_id: categoryProductMap[shopData.category], // Assigning the shop's main category to products for simplicity
                price: {
                    current: prod.price,
                    currency: 'MGA'
                },
                stock: {
                    quantity: 100, // Requested: 100 pieces available
                    status: 'in_stock'
                },
                is_active: true
            }));

            await Product.insertMany(productsToInsert);
            console.log(`      📦 ${productsToInsert.length} products added to ${shop.name}`);
        }

        console.log('✅ Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
