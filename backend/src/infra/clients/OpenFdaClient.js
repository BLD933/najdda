class OpenFdaClient {
  constructor() {
    this.baseUrl = 'https://api.fda.gov/drug/label.json';
  }

  buildHeaders() {
    return { Accept: 'application/json' };
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
        drugInteractions: [],
        pregnancyInfo: [],
        rawBrandNames: [],
      };
    }

    return {
      found: true,
      warnings: this.extractSection(result.warnings),
      adverseReactions: this.extractSection(result.adverse_reactions),
      // The FDA-approved label's "Drug Interactions" section. This is the
      // authoritative interaction source we have: the NLM RxNav interaction API
      // (`/REST/interaction/*`) has been retired upstream and returns 404 for
      // every request, so it silently yielded zero interactions and the
      // assessment fell back to whatever the model recalled.
      drugInteractions: this.extractSection(result.drug_interactions),
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
      return { found: false, warnings: [], adverseReactions: [], drugInteractions: [], pregnancyInfo: [] };
    }

    const key = process.env.OPENFDA_API_KEY
      ? `&api_key=${encodeURIComponent(process.env.OPENFDA_API_KEY)}`
      : '';
    const notFound = () => ({
      found: false,
      warnings: [],
      adverseReactions: [],
      drugInteractions: [],
      pregnancyInfo: [],
      query: normalized,
    });

    // Exact generic name first. A quoted full-text search matched unrelated
    // labels — "aspirin" returned naproxen's label, whose interaction section
    // then described the wrong drug to the patient.
    const attempts = [
      `${this.baseUrl}?search=${encodeURIComponent(`openfda.generic_name:"${normalized}"`)}&limit=5${key}`,
      // Branded or unusual names: fall back to the full-text index.
      `${this.baseUrl}?search=${encodeURIComponent(`"${normalized}"`)}&limit=1${key}`,
    ];

    let fallback = null;

    for (const url of attempts) {
      const response = await fetch(url, { headers: this.buildHeaders() });

      if (response.status === 404) continue;
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenFDA API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      for (const result of results) {
        const parsed = this.parseLabel(result);
        if (!parsed.found) continue;
        // Several labels exist for one drug. The first hit is often a short OTC
        // label with no "Drug Interactions" section at all, so prefer one that
        // has it and keep the first as a backstop.
        if (parsed.drugInteractions.length > 0) return { ...parsed, query: normalized };
        if (!fallback) fallback = { ...parsed, query: normalized };
      }
      if (fallback) return fallback;
    }

    return notFound();
  }
}

module.exports = new OpenFdaClient();
