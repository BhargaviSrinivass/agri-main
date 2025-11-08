const axios = require('axios');

const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );

    const weatherData = response.data;
    
    // Generate alerts based on weather conditions
    const alerts = generateWeatherAlerts(weatherData);

    res.json({
      success: true,
      data: weatherData,
      alerts: alerts
    });

  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data'
    });
  }
};

const generateWeatherAlerts = (weatherData) => {
  const alerts = [];
  const temp = weatherData.main.temp;
  const humidity = weatherData.main.humidity;
  const weatherMain = weatherData.weather[0].main;
  const windSpeed = weatherData.wind.speed;

  // Temperature alerts
  if (temp > 35) {
    alerts.push({
      type: 'warning',
      message: 'High temperature alert! Consider irrigation and shading for crops.',
      severity: 'high'
    });
  } else if (temp < 5) {
    alerts.push({
      type: 'warning',
      message: 'Low temperature alert! Protect crops from frost.',
      severity: 'high'
    });
  }

  // Rainfall alerts
  if (weatherMain === 'Rain') {
    alerts.push({
      type: 'info',
      message: 'Rain expected. Good for crops but monitor for waterlogging.',
      severity: 'medium'
    });
  }

  // Humidity alerts
  if (humidity > 80) {
    alerts.push({
      type: 'warning',
      message: 'High humidity! Watch for fungal diseases in crops.',
      severity: 'medium'
    });
  } else if (humidity < 30) {
    alerts.push({
      type: 'info',
      message: 'Low humidity! Consider irrigation.',
      severity: 'low'
    });
  }

  // Wind alerts
  if (windSpeed > 25) {
    alerts.push({
      type: 'warning',
      message: 'Strong winds! Protect young plants and structures.',
      severity: 'medium'
    });
  }

  // No alerts condition
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      message: 'Weather conditions are favorable for farming activities.',
      severity: 'low'
    });
  }

  return alerts;
};

module.exports = {
  getWeather
};