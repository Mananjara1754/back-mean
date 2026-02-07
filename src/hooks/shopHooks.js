const fs = require('fs');
const path = require('path');

const moveLogo = async function(doc, next) {
    try {
        if (doc.logo) {
            const shopId = doc._id.toString();
            const targetDir = path.join(process.cwd(), 'uploads', 'shops', 'logo');
            const targetFilename = `${shopId}.jpeg`;
            const targetPath = path.join(targetDir, targetFilename);

            // Normalize paths for comparison
            // Assuming doc.logo contains a relative path or absolute path from the upload process
            const currentPath = path.resolve(doc.logo);
            const absoluteTargetPath = path.resolve(targetPath);

            // Only proceed if the current path is different from the target path
            if (currentPath !== absoluteTargetPath) {
                // Ensure target directory exists
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                // Check if source file exists
                if (fs.existsSync(currentPath)) {
                    // Move/Rename file
                    // We assume the file is accessible and can be moved
                    fs.renameSync(currentPath, absoluteTargetPath);

                    // Update the document in the database
                    // Use updateOne to avoid triggering save hooks again
                    // doc.constructor refers to the Model (Shop)
                    await doc.constructor.updateOne(
                        { _id: doc._id },
                        { $set: { logo: `uploads/shops/logo/${targetFilename}` } }
                    );
                    
                    console.log(`Updated Shop logo for ${doc._id}`);
                }
            }
        }
        // Call next() if provided (mongoose hooks sometimes behave differently with async/await, 
        // but post hooks with async usually don't need next unless defined with 2 args)
        // However, we defined it as function(doc, next)
        if (next) next();
    } catch (error) {
        console.error('Error in moveLogo hook:', error);
        if (next) next(error);
    }
};

module.exports = (schema) => {
    schema.post('save', moveLogo);
};
