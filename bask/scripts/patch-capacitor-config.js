const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../ios/App/App/capacitor.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const localPlugins = ['BaskWeatherPlugin', 'BaskHealthPlugin', 'BaskLiveActivityPlugin'];

for (const plugin of localPlugins) {
  if (!config.packageClassList.includes(plugin)) {
    config.packageClassList.push(plugin);
  }
}

fs.writeFileSync(configPath, JSON.stringify(config, null, '\t'));
console.log('✅ Added local plugins to capacitor.config.json');
