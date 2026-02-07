const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Shop = require('./src/models/Shop');
const Product = require('./src/models/Product');

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

const createDummyFile = (filename) => {
    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, 'dummy content');
    return filePath;
};

const testHooks = async () => {
    await connectDB();

    try {
        // Cleanup uploads for test
        // fs.rmSync(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });

        // 1. Test Shop Logo Hook
        console.log('🧪 Testing Shop Logo Hook...');
        const tempLogoPath = createDummyFile('temp_logo.png');
        
        const shop = await Shop.create({
            name: 'Test Shop Hook',
            logo: tempLogoPath, // This path will be normalized by the hook
            owner_user_id: new mongoose.Types.ObjectId() // Dummy ID
        });

        // Wait a bit for async post hook if necessary (though await create should wait for save, post hooks are usually awaited by mongoose if they return promise)
        // Let's check the DB document
        const updatedShop = await Shop.findById(shop._id);
        console.log('Shop Logo Path in DB:', updatedShop.logo);

        const expectedLogoPath = `uploads/shops/logo/${shop._id}.jpeg`;
        if (updatedShop.logo === expectedLogoPath) {
             console.log('✅ Shop logo path updated correctly in DB');
        } else {
             console.error('❌ Shop logo path NOT updated correctly in DB');
        }

        const absoluteExpectedPath = path.join(process.cwd(), expectedLogoPath);
        if (fs.existsSync(absoluteExpectedPath)) {
            console.log('✅ Shop logo file moved correctly');
        } else {
            console.error('❌ Shop logo file NOT moved');
        }

        // Cleanup temp file if it still exists (should have been moved/renamed)
        if (fs.existsSync(tempLogoPath)) {
            console.log('⚠️ Original temp file still exists (rename should remove it usually)');
            fs.unlinkSync(tempLogoPath);
        }

        // 2. Test Product Images Hook
        console.log('\n🧪 Testing Product Images Hook...');
        const tempImg1 = createDummyFile('temp_img1.png');
        const tempImg2 = createDummyFile('temp_img2.jpg');

        const product = await Product.create({
            shop_id: shop._id,
            name: 'Test Product Hook',
            price: { current: 100 },
            images: [tempImg1, tempImg2]
        });

        const updatedProduct = await Product.findById(product._id);
        console.log('Product Images in DB:', updatedProduct.images);

        const expectedImg1 = `uploads/products/${product._id}/01.jpeg`;
        const expectedImg2 = `uploads/products/${product._id}/02.jpeg`;

        if (updatedProduct.images.includes(expectedImg1) && updatedProduct.images.includes(expectedImg2)) {
             console.log('✅ Product images paths updated correctly in DB');
        } else {
             console.error('❌ Product images paths NOT updated correctly in DB');
        }

        if (fs.existsSync(path.join(process.cwd(), expectedImg1)) && fs.existsSync(path.join(process.cwd(), expectedImg2))) {
             console.log('✅ Product image files moved correctly');
        } else {
             console.error('❌ Product image files NOT moved');
        }

        // 3. Test Product Images Limit
        console.log('\n🧪 Testing Product Images Limit (Max 5)...');
        try {
            await Product.create({
                shop_id: shop._id,
                name: 'Limit Test',
                price: { current: 100 },
                images: ['1', '2', '3', '4', '5', '6'] // 6 images
            });
            console.error('❌ Failed to catch limit error');
        } catch (err) {
            if (err.errors && err.errors.images) {
                console.log('✅ Caught limit error:', err.errors.images.message);
            } else {
                console.error('❌ Unexpected error:', err);
            }
        }

        console.log('\n✨ Tests Completed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
};

testHooks();
