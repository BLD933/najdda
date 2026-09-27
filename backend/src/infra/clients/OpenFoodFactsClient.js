class OpenFoodFactsClient {
  constructor() {
    this.baseUrl = process.env.OPENFOODFACTS_API_URL || 'https://world.openfoodfacts.org/cgi/search.pl';
  }

  normalizeFoodName(name) {
    return name.trim().toLowerCase().replace(/[^\\w\\sàâäéèêëïîôùûüÿçæœ-]/gi, '');
  }

  parseProduct(product) {
    if (!product) {
      return { found: false, ingredients: '', labels: '', allergens: '', additives: '' };
    }

    return {
      found: true,
      name: product.product_name || product.product_name_fr || 'Unknown',
      ingredients: product.ingredients_text || product.ingredients_text_fr || '',
      labels: product.labels || '',
      allergens: product.allergens || product.allergens_from_ingredients || '',
      additives: product.additives_tags
        ? product.additives_tags.map((a) => a.replace('en:', '')).join(', ')
        : '',
      nutriscore: product.nutriscore_grade || 'N/A',
      categories: product.categories || '',
    };
  }

  async searchFood(foodName) {
    const normalized = this.normalizeFoodName(foodName);
    if (!normalized) {
      return { found: false, ingredients: '', labels: '', allergens: '', additives: '', query: '' };
    }

    try {
      const params = new URLSearchParams({
        search_terms: normalized,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '1',
        fields: 'product_name,product_name_fr,ingredients_text,ingredients_text_fr,labels,allergens,allergens_from_ingredients,additives_tags,nutriscore_grade,categories',
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SHIFAA-App/1.0 (pregnancy-safety-checker)' },
      });

      if (!response.ok) {
        console.error(`OpenFoodFacts API error: ${response.status}`);
        return { found: false, query: normalized };
      }

      const data = await response.json();
      const product = data.products?.[0] || null;
      const parsed = this.parseProduct(product);

      return { ...parsed, query: normalized };
    } catch (err) {
      console.error('OpenFoodFacts API failed, continuing without food data:', err.message);
      return { found: false, query: normalized };
    }
  }
}

module.exports = new OpenFoodFactsClient();
