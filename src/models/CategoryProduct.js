const mongoose = require('mongoose');

const CategoryProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String },
        slug: { type: String, unique: true }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('CategoryProduct', CategoryProductSchema);
