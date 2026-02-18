const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
    {
        shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

        type: {
            type: String,
            enum: ['homepage', 'carousel', 'featured', 'discount'],
            required: true
        },

        title: { type: String, required: true },
        description: { type: String },
        image: { type: String },
        discount_percent: { type: Number, default: 0 },

        product_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

        budget: {
            amount: { type: Number, required: true },
            currency: {
                type: String, default: 'MGA'
            }
        },

        stats: {
            views: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
            orders_generated: { type: Number, default: 0 }
        },

        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },

        is_active: { type: Boolean, default: true },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Promotion', PromotionSchema);
