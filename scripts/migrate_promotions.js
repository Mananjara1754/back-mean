const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to DB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grosserie');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const migrate = async () => {
    await connectDB();

    try {
        // Load Models
        const Product = require('../src/models/Product');
        const Promotion = require('../src/models/Promotion');

        console.log('Fetching products with active promotions...');
        const products = await Product.find({ 'promotion.is_active': true });
        console.log(`Found ${products.length} products with active promotions.`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            // Check if this product is already linked to a Promotion
            const existingPromo = await Promotion.findOne({ product_ids: product._id });

            if (existingPromo) {
                console.log(`Product "${product.name}" (${product._id}) already in promotion "${existingPromo.title}". Skipping.`);
                skippedCount++;
                continue;
            }

            console.log(`Creating promotion for product "${product.name}"...`);

            const newPromo = new Promotion({
                shop_id: product.shop_id,
                type: 'discount',
                title: `Promo: ${product.name}`,
                description: 'Auto-migrated from Product Management',
                image: product.images && product.images[0] ? product.images[0] : '',
                product_ids: [product._id],
                discount_percent: product.promotion.discount_percent,
                start_date: product.promotion.start_date || new Date(),
                end_date: product.promotion.end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                budget: { amount: 0, currency: 'MGA' },
                is_active: true
            });

            await newPromo.save();
            createdCount++;
        }

        console.log('Migration completed.');
        console.log(`Created: ${createdCount}`);
        console.log(`Skipped: ${skippedCount}`);

        process.exit();

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
