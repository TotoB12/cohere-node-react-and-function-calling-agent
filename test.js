const { get } = require("axios");

async function get_weather(input) {
  try {
    const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=1&appid=be7cbd382c66e8090c59bd782093bfdf`;
    const geocode = await get(geocodingUrl);
    
    const { lat, lon } = geocode.data[0];
    console.log(lat, lon);
    
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=be7cbd382c66e8090c59bd782093bfdf`;
    const weather = await get(weatherUrl);
    
    const weatherData = weather.data;
    console.log(weatherData);
    
    return weatherData;
  } catch (error) {
    console.error(error);
    return null; // You can handle the error as needed
  }
}

get_weather("paris");const { get } = require("axios");

async function get_weather(input) {
  const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=1&appid=be7cbd382c66e8090c59bd782093bfdf`;
  const geocode = get(geocodingUrl);
  geocode.then(response => {
    const lat = response.data[0].lat;
    const lon = response.data[0].lon;
    console.log(lat, lon);
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=be7cbd382c66e8090c59bd782093bfdf`
    const weather = get(weatherUrl);
    weather.then(response => {
      const weather = response.data;
      console.log(weather);
      return weather;
    });
  }).catch(error => {
    console.error(error);
  });
}

get_weather("paris")
