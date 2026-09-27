const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.resolve(__dirname, '../../../../.agents/skills');

const RELEVANT_SKILLS = [
  ['clinical-decision-support', 'Generates clinical decision support documents with GRADE evidence grading'],
  ['clinical-diagnostic-reasoning', 'Clinical reasoning: differential diagnosis, cognitive bias detection, systematic error analysis'],
  ['clinical-nlp-extractor', 'Extracts medical entities from patient text: symptoms, medications, lab values, diagnoses'],
  ['clinical-note-summarization', 'Summarizes clinical notes, SOAP, H&P, discharge summaries'],
  ['crisis-detection-intervention-ai', 'Detects crisis signals, suicide ideation, automated escalation protocols'],
  ['crisis-response-protocol', 'Mental health crisis handling: safety protocols, emergency escalation, hotline integration'],
  ['drug-interaction-checker', 'Drug-drug interaction prediction and risk assessment with severity classification'],
  ['emergency-card', 'Generates emergency medical information cards with critical health data'],
  ['hipaa-compliance', 'HIPAA compliance for handling PHI: audit logging, access controls, security event tracking'],
  ['medical-entity-extractor', 'Extracts medical entities (symptoms, medications, lab values, diagnoses) from patient messages'],
  ['patiently-ai', 'Simplifies medical documents for patients: translates clinical language to plain language'],
  ['tooluniverse-clinical-guidelines', 'Clinical practice guidelines from NICE, WHO, AHA/ACC, NCCN and more'],
  ['tooluniverse-disease-research', 'Comprehensive disease research: epidemiology, mechanisms, diagnostics, treatments, trials'],
  ['tooluniverse-drug-drug-interaction', 'DDI prediction: CYP450/transporter mechanisms, severity, polypharmacy analysis, alternatives'],
  ['tooluniverse-pharmacovigilance', 'Drug safety signal analysis: FAERS, PRR/ROR, pharmacogenomic risk assessment'],
  ['tooluniverse-rare-disease-diagnosis', 'Rare disease differential diagnosis: HPO matching, Orphanet/OMIM, VUS interpretation'],
  ['treatment-plans', 'Generates structured treatment plans and care recommendations'],
  ['lab-results', 'Interprets laboratory results and diagnostic test values'],
];

class SkillLoader {
  constructor() {
    this.cache = null;
  }

  loadAll() {
    if (this.cache) return this.cache;

    const lines = RELEVANT_SKILLS.map(([name, desc]) => `- ${name}: ${desc}`);
    this.cache = lines.join('\n');
    return this.cache;
  }
}

module.exports = new SkillLoader();
