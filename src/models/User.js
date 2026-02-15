const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['buyer', 'shop', 'admin'],
            default: 'buyer'
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'pending'],
            default: 'active'
        },
        profile: {
            firstname: { type: String, required: true },
            lastname: { type: String, required: true },
            email: { type: String, required: true, unique: true },
            password_hash: { type: String, required: true },
            phone: { type: String },
            avatar: { type: String },
            preferences: {
                categories: [{ type: String }],
                notifications: { type: Boolean, default: true }
            }
        },
        shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
        favorite_products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        last_login: { type: Date },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

UserSchema.pre('save', async function () {
    if (!this.isModified('profile.password_hash')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.profile.password_hash = await bcrypt.hash(this.profile.password_hash, salt);
    } catch (err) {
        throw err;
    }
});

UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.profile.password_hash);
};

module.exports = mongoose.model('User', UserSchema);
