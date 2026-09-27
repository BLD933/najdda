class OpenWeatherClient {
  constructor() {
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  }

  buildQuery(city, country) {
    const cleanCity = city.trim();
    if (country && country.trim()) {
      return `${cleanCity},${country.trim()}`;
    }
    return cleanCity;
  }

  async getWeatherByCity(city, country = 'Morocco') {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }

    const q = this.buildQuery(city, country);
    const url = `${this.baseUrl}?q=${encodeURIComponent(q)}&units=metric&appid=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenWeather API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      city: data.name,
      country: data.sys?.country,
      lat: data.coord?.lat,
      lon: data.coord?.lon,
      temperatureC: data.main?.temp,
      feelsLikeC: data.main?.feels_like,
      humidity: data.main?.humidity,
      windSpeed: data.wind?.speed,
      condition: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
    };
  }
}

module.exports = new OpenWeatherClient();
