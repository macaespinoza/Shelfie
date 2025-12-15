require('dotenv').config();
const { sequelize } = require('./src/config/database');
const shelfService = require('./src/services/shelfService');
const { Shelf } = require('./src/models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Get the most recent shelf
    const shelf = await Shelf.findOne({
      order: [['created_at', 'DESC']],
    });

    if (!shelf) {
      console.log('No shelves found');
      return;
    }

    console.log('Found shelf:', shelf.id, shelf.name, shelf.category);

    // Simulate controller logic for showShelf
    const fullShelf = await shelfService.getShelfById(shelf.id, true);
    console.log('getShelfById success');

    const canView = await shelfService.canViewShelf(shelf.id, shelf.userId); // simulate owner
    console.log('canView:', canView);

    // This is the part inside existing try/catch, but let's test it explicitly
    try {
        const popular = await shelfService.getPopularContent(shelf.category);
        console.log('getPopularContent success. Results:', popular.results?.length);
        
        if (popular.results) {
            popular.results.forEach((item, i) => {
                // items should have externalId, title, imageUrl, metadata
                if (!item.title) console.warn(`Item ${i} missing title`);
                
                // Test JSON serialization (for the json helper)
                try {
                    JSON.stringify(item.metadata);
                } catch (e) {
                    console.error(`Item ${i} metadata fails JSON serialization:`, e.message);
                }
            });
        }
    } catch (err) {
        console.error('getPopularContent FAILED:', err);
    }

    console.log('Data checks finished.');

  } catch (error) {
    console.error('CRASH (Global):', error);
    if (error.original) console.error('Original Error:', error.original);
  } finally {
    if (sequelize) await sequelize.close();
  }
}

run();
