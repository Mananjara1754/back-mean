const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        order_number: { type: String, required: true, unique: true },

        buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

        items: [
            {
                product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                name: { type: String, required: true },
                quantity: { type: Number, required: true },
                unit_price: { type: Number, required: true }, // HT
                unit_price_ttc: { type: Number }, // TTC (After discount)
                original_unit_price_ttc: { type: Number }, // TTC (Before discount)
                is_promo: { type: Boolean, default: false },
                total_price: { type: Number, required: true }, // HT
                total_price_ttc: { type: Number } // TTC
            }
        ],

        amounts: {
            subtotal: { type: Number, required: true },
            tax: { type: Number, default: 0 },
            total: { type: Number, required: true },
            currency: {
                type: String, default: 'MGA'
            }
        },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },

        payment_status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },

        delivery: {
            type: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
            address: { type: String }
        },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Order', OrderSchema);
