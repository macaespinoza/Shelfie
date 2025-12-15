require('dotenv').config();
const { sequelize } = require('./src/config/database');
const shelfService = require('./src/services/shelfService');
const { Shelf } = require('./src/models');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register helpers (COPIED FROM app.js)
Handlebars.registerHelper({
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    and: (...args) => args.slice(0, -1).every(Boolean),
    or: (...args) => args.slice(0, -1).some(Boolean),
    not: (value) => !value,
    formatDate: (date) => {
      if (!date) return ''
      const d = new Date(date)
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${months[d.getMonth()]} ${d.getFullYear()}`
    },
    formatDateTime: (date) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    currentYear: () => new Date().getFullYear(),
    substring: (str, start, end) => {
      if (!str) return ''
      return str.substring(start, end).toUpperCase()
    },
    truncate: (str, length) => {
      if (!str) return ''
      if (str.length <= length) return str
      return str.substring(0, length) + '...'
    },
    json: (obj) => JSON.stringify(obj),
    pluralize: (count, singular, plural) => {
      return count === 1 ? singular : plural
    },
    includes: (array, value) => {
      if (!array) return false
      return array.includes(value)
    },
    addOne: (num) => num + 1,
    subtract: (a, b) => a - b,
    times: function(n, block) {
      let result = ''
      for (let i = 0; i < n; i++) {
        result += block.fn(this, { data: { index: i } })
      }
      return result
    }
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Get the most recent shelf
    const shelf = await Shelf.findOne({
      order: [['created_at', 'DESC']],
      include: ['owner'] 
    });

    if (!shelf) {
      console.log('No shelves found');
      return;
    }

    console.log('Found shelf:', shelf.id, shelf.name, shelf.category);

    const fullShelf = await shelfService.getShelfById(shelf.id, true);
    const categoryInfo = fullShelf.getCategoryInfo();
    const portraitCategories = ['movies', 'series', 'books', 'games'];
    const isPortrait = portraitCategories.includes(fullShelf.category);
    
    // Simulate popular suggestions
    let popularSuggestions = { results: [] };
    try {
        const popular = await shelfService.getPopularContent(fullShelf.category);
        popularSuggestions.results = (popular.results || []).slice(0, 8);
    } catch (e) {
        console.error('Error fetching popular:', e);
    }

    // Context for template
    const context = {
        title: `${fullShelf.name} - Shelfie`,
        shelf: {
          ...fullShelf.toJSON(),
          categoryInfo,
          owner: fullShelf.owner.toJSON() // Ensure owner is present
        },
        isOwner: true, // Simulate owner
        isPortrait,
        popularSuggestions,
        currentUser: fullShelf.owner.toJSON() // simulate logged in user
    };

    // Read template
    const templatePath = path.join(__dirname, 'src/views/pages/shelf/show.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');

    // Compile and Render
    console.log('Compiling template...');
    const template = Handlebars.compile(templateSource);
    
    console.log('Rendering template...');
    const html = template(context, {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    });

    console.log('Render SUCCESS! HTML length:', html.length);

  } catch (error) {
    console.error('RENDER CRASH:', error);
  } finally {
    if (sequelize) await sequelize.close();
  }
}

run();
