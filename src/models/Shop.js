const mongoose = require('mongoose');
const shopHooks = require('../hooks/shopHooks');

const ShopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        logo: { type: String },
        category: { type: String },

        location: {
            floor: { type: Number },
            zone: { type: String },
            map_position: {
                x: { type: Number },
                y: { type: Number }
            }
        },

        opening_hours: {
            monday: { open: { type: String }, close: { type: String } },
            tuesday: { open: { type: String }, close: { type: String } },
            // Add other days if needed, but sticking to user provided example for now or generic structure
            // Design example only showed monday/tuesday, but usually it's full week. 
            // I'll stick to a Map or flexible object if possible, or just defined fields.
            // Since it's MongoDB, we can be flexible. But Mongoose needs schema.
            // Let's define generic day structure for all days to be safe? 
            // User example: "monday": { ... }, "tuesday": { ... }
            // I will add all days to be comprehensive.
            wednesday: { open: { type: String }, close: { type: String } },
            thursday: { open: { type: String }, close: { type: String } },
            friday: { open: { type: String }, close: { type: String } },
            saturday: { open: { type: String }, close: { type: String } },
            sunday: { open: { type: String }, close: { type: String } }
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
