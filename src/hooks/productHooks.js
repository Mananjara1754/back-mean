const fs = require('fs');
const path = require('path');

const moveImages = async function(doc, next) {
    try {
        if (doc.images && doc.images.length > 0) {
            const productId = doc._id.toString();
            const targetDir = path.join(process.cwd(), 'uploads', 'products', productId);
            
            let updatedImages = [];
            let hasChanges = false;

            // Ensure target directory exists
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            for (let i = 0; i < doc.images.length; i++) {
                const imagePath = doc.images[i];
                // Format: 01.jpeg, 02.jpeg, etc.
                // Pad with leading zero if needed (01, 02, ..., 05)
                const indexStr = (i + 1).toString().padStart(2, '0');
                const targetFilename = `${indexStr}.jpeg`;
                const targetPath = path.join(targetDir, targetFilename);

                const currentPath = path.resolve(imagePath);
                const absoluteTargetPath = path.resolve(targetPath);

                if (currentPath !== absoluteTargetPath) {
                    if (fs.existsSync(currentPath)) {
                        fs.renameSync(currentPath, absoluteTargetPath);
                        // Store relative path in DB
                        updatedImages.push(`uploads/products/${productId}/${targetFilename}`);
                        hasChanges = true;
                    } else {
                        // If file doesn't exist (maybe already correct or URL), keep original
                        updatedImages.push(imagePath);
                    }
                } else {
                    updatedImages.push(imagePath);
                }
            }

            if (hasChanges) {
                await doc.constructor.updateOne(
                    { _id: doc._id },
                    { $set: { images: updatedImages } }
                );
                console.log(`Updated Product images for ${doc._id}`);
            }
        }
        if (next) next();
    } catch (error) {
        console.error('Error in moveImages hook:', error);
        if (next) next(error);
    }
};

module.exports = (schema) => {
    // Use schema validator for array length limit
    schema.path('images').validate(function(value) {
        // If value is null/undefined, pass (unless required handled elsewhere)
        if (!value) return true;
        return value.length <= 5;
    }, 'You can upload a maximum of 5 images.');

    schema.post('save', moveImages);
};
