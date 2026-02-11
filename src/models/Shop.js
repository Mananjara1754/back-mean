const mongoose = require('mongoose');
const shopHooks = require('../hooks/shopHooks');

const ShopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        logo: { type: String },
        category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryShop' },

        location: {
            floor: { type: Number },
            zone: { type: String },
            map_position: {
                x: { type: Number },
                y: { type: Number }
            }
        },

        opening_hours: {
            monday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            tuesday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            wednesday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            thursday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            friday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            saturday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } },
            sunday: { open: { type: String }, close: { type: String }, is_closed: { type: Boolean, default: false } }
        },

        rent: {
            amount: { type: Number },
            currency: { type: String, default: 'EUR' },
            billing_cycle: { type: String, default: 'monthly' }
        },

        owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        stats: {
            total_sales: { type: Number, default: 0 },
            total_orders: { type: Number, default: 0 },
            rating: { type: Number, default: 0 }
        },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

shopHooks(ShopSchema);

module.exports = mongoose.model('Shop', ShopSchema);
