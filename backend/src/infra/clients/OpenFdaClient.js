class OpenFdaClient {
  constructor() {
    this.baseUrl = 'https://api.fda.gov/drug/label.json';
  }

  buildHeaders() {
    const headers = { Accept: 'application/json' };
    if (process.env.OPENFDA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OPENFDA_API_KEY}`;
    }
    return headers;
  }

  normalizeDrugName(name) {
    return name.trim().toLowerCase().replace(/[^\w\s-]/g, '');
  }

  extractSection(field) {
    if (!field) return [];
    const values = Array.isArray(field) ? field : [field];
    return values
      .map((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''))
      .filter(Boolean)
      .slice(0, 3);
  }

  parseLabel(result) {
    if (!result) {
      return {
        found: false,
        warnings: [],
        adverseReactions: [],
        pregnancyInfo: [],
        rawBrandNames: [],
      };
    }

    return {
      found: true,
      warnings: this.extractSection(result.warnings),
      adverseReactions: this.extractSection(result.adverse_reactions),
      pregnancyInfo: [
        ...this.extractSection(result.pregnancy),
        ...this.extractSection(result.female),
        ...this.extractSection(result.nursing_mothers),
      ],
      pediatricUse: this.extractSection(result.pediatric_use),
      dosageAndAdministration: this.extractSection(result.dosage_and_administration),
      rawBrandNames: result.openfda?.brand_name?.slice(0, 5) || [],
      genericNames: result.openfda?.generic_name?.slice(0, 5) || [],
    };
  }

  async searchDrug(medicationName) {
    const normalized = this.normalizeDrugName(medicationName);
    if (!normalized) {
      return { found: false, warnings: [], adverseReactions: [], pregnancyInfo: [] };
    }

    const encoded = encodeURIComponent(`"${normalized}"`);
    const url = `${this.baseUrl}?search=${encoded}&limit=1`;

    const response = await fetch(url, { headers: this.buildHeaders() });

    if (response.status === 404) {
      return { found: false, warnings: [], adverseReactions: [], pregnancyInfo: [], query: normalized };
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenFDA API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const parsed = this.parseLabel(data.results?.[0]);
    return { ...parsed, query: normalized };
  }
}

module.exports = new OpenFdaClient();
