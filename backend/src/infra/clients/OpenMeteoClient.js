const axios = require('axios');

class OpenMeteoClient {
  constructor() {
    this.baseUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  }

  async getAirQualityAndPollen(latitude, longitude) {
    if (!latitude || !longitude) {
      return null;
    }

    try {
      const url = `${this.baseUrl}?latitude=${latitude}&longitude=${longitude}&current=european_aqi,us_aqi,pm10,pm2_5,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`;
      const response = await axios.get(url);
      
      const data = response.data;
      const current = data.current;
      
      if (!current) return null;

      const totalPollen = 
        (current.alder_pollen || 0) +
        (current.birch_pollen || 0) +
        (current.grass_pollen || 0) +
        (current.mugwort_pollen || 0) +
        (current.olive_pollen || 0) +
        (current.ragweed_pollen || 0);

      let pollenLevel = 'low';
      if (totalPollen > 50) pollenLevel = 'medium';
      if (totalPollen > 150) pollenLevel = 'high';
      if (totalPollen > 300) pollenLevel = 'very high';

      // AQI standard: 0-50 Good, 51-100 Moderate, 101+ Unhealthy
      let airQuality = 'good';
      if (current.us_aqi > 50) airQuality = 'moderate';
      if (current.us_aqi > 100) airQuality = 'poor';
      if (current.us_aqi > 150) airQuality = 'very poor';

      return {
        aqi_european: current.european_aqi,
        aqi_us: current.us_aqi,
        air_quality_level: airQuality,
        pm10: current.pm10,
        pm2_5: current.pm2_5,
        total_pollen_grains: Math.round(totalPollen),
        pollen_level: pollenLevel,
        details: {
          alder: current.alder_pollen,
          birch: current.birch_pollen,
          grass: current.grass_pollen,
          mugwort: current.mugwort_pollen,
          olive: current.olive_pollen,
          ragweed: current.ragweed_pollen
        }
      };
    } catch (error) {
      console.error('Error fetching OpenMeteo Air Quality & Pollen:', error.message);
      return null;
    }
  }
}

module.exports = new OpenMeteoClient();
