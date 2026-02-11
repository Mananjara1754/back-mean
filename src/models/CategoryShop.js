const mongoose = require('mongoose');

const CategoryShopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String },
        icon: { type: String }, // Optional icon/emoji for the category
        is_active: { type: Boolean, default: true }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('CategoryShop', CategoryShopSchema);
