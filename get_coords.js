const https = require('https');

const places = [
  "Plaza V Centenario, Panama",
  "Playa Prieta, Panama",
  "Plaza Simón Bolívar, Panama",
  "Plaza de la Independencia, Panama",
  "Plaza Herrera, Panama",
  "Arco Chato, Panama",
  "Playa Santo Domingo, Panama",
  "Plaza de Francia, Panama",
  "La Fisheria, Panama"
];

function fetchCoords(place) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    https.get(url, { headers: { 'User-Agent': 'node-script' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) {
            resolve({ place, lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) });
          } else {
            resolve({ place, lat: null, lon: null });
          }
        } catch (e) {
          resolve({ place, lat: null, lon: null });
        }
      });
    }).on('error', () => resolve({ place, lat: null, lon: null }));
  });
}

async function run() {
  for (const place of places) {
    const res = await fetchCoords(place);
    if (res.lat) {
      // bbox=-79.5385%2C8.9495%2C-79.5285%2C8.9565
      // lon min: -79.5385, max: -79.5285 (diff 0.01)
      // lat min: 8.9495, max: 8.9565 (diff 0.007)
      
      const left = ((res.lon - (-79.5385)) / 0.01) * 100;
      const top = ((8.9565 - res.lat) / 0.007) * 100;
      console.log(`${place}: lat ${res.lat}, lon ${res.lon} => top: ${top.toFixed(1)}%, left: ${left.toFixed(1)}%`);
    } else {
      console.log(`${place}: not found`);
    }
  }
}

run();
