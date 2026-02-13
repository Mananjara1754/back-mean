const mongoose = require('mongoose');
const productHooks = require('../hooks/productHooks');

const ProductSchema = new mongoose.Schema(
    {
        shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

        name: { type: String, required: true },
        description: { type: String },
        category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryProduct' },
        images: [{ type: String }],

        price: {
            current: { type: Number, required: true }, // HT (Hors Taxe)
            ttc: { type: Number }, // TTC (Toute Taxe Comprise)
            currency: {
                type: String, default: 'MGA'
            }
        },

        price_history: [
            {
                price: { type: Number },
                from: { type: Date },
                to: { type: Date }
            }
        ],

        stock: {
            quantity: { type: Number, required: true, default: 0 },
            low_stock_threshold: { type: Number, default: 10 },
            status: {
                type: String,
                enum: ['in_stock', 'low_stock', 'out_of_stock'],
                default: 'in_stock'
            }
        },

        promotion: {
            is_active: { type: Boolean, default: false },
            discount_percent: { type: Number, default: 0 },
            start_date: { type: Date },
            end_date: { type: Date }
        },

        is_active: { type: Boolean, default: true },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

productHooks(ProductSchema);

module.exports = mongoose.model('Product', ProductSchema);
