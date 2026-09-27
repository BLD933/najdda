// French strings — the primary language for this product (CLAUDE.md: "French
// primary (patient-facing)").
//
// On "keep medical emergency text unchanged": read as *do not reword emergency
// copy while polishing the UI*, not "never translate it" — otherwise the
// most safety-critical surface would be the only one left in English, which
// defeats the bilingual requirement. So the emergency strings below are
// translated FAITHFULLY: same severity, same imperative, same ordering, no
// softening, and the emergency NUMBER is always supplied by the caller, never
// written into a sentence here. Compare en.js `chat.empty.emergencyText` —
// it is the same message in the same order.
//
// Key order is identical to en.js on purpose: a one-line diff is how a
// translator or reviewer checks a new string was not dropped.
export default {
  // ── Global ────────────────────────────────────────────────────────────────
  'app.loading': 'Chargement…',
  'app.error.network': "Je n'ai pas pu joindre le service médical. Si c'est urgent, appelez immédiatement le numéro d'urgence.",

  // ── Language switcher ─────────────────────────────────────────────────────
  'language.switcher.label': "Langue de l'interface",
  'language.switcher.fr': 'Français',
  'language.switcher.en': 'English',

  // ── Theme switcher ────────────────────────────────────────────────────────
  'theme.label': "Thème de l'interface",
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'theme.system': 'Système',

  // ── Auth: login ───────────────────────────────────────────────────────────
  'login.title': 'Content de vous revoir',
  'login.subtitle': 'Connectez-vous à votre compte NAJDDA',
  'login.email': 'Adresse e-mail',
  'login.password': 'Mot de passe',
  'login.submitting': 'Connexion…',
  'login.submit': 'Se connecter',
  'login.noAccount': 'Pas encore de compte ?',
  'login.signup': 'Créer un compte',
  'login.emailPlaceholder': 'vous@exemple.com',
  'login.passwordPlaceholder': '••••••••',

  // ── Auth: register ────────────────────────────────────────────────────────
  'register.title': 'Créer un compte',
  'register.subtitle': 'Rejoignez NAJDDA et commencez votre parcours santé',
  'register.fullName': 'Nom complet',
  'register.fullNamePlaceholder': 'Jean Dupont',
  'register.email': 'Adresse e-mail',
  'register.emailPlaceholder': 'vous@exemple.com',
  'register.password': 'Mot de passe',
  'register.passwordPlaceholder': '••••••••',
  'register.submitting': 'Création du compte…',
  'register.submit': 'Créer mon compte',
  'register.hasAccount': 'Vous avez déjà un compte ?',
  'register.signin': 'Se connecter',

  // ── Dashboard ─────────────────────────────────────────────────────────────
  'nav.systemLive': 'Système opérationnel',
  'nav.passport': 'Passeport',
  // Not "Quitter": on a nav bar next to an SOS screen, "quitter" reads as
  // "close the app". "Déconnexion" is unambiguous about signing out.
  'nav.exit': 'Déconnexion',
  'brand.name': 'NAJDDA',

  'dashboard.hero.status': 'État médical : stable',
  'dashboard.hero.greeting': 'Salam, {name}.',
  'dashboard.hero.greetingFallback': 'patient',
  'dashboard.hero.subtitle': "Votre hôpital spécialisé en IA est prêt. Sélectionnez un service pour commencer votre téléconsultation.",

  'dashboard.service.triage.title': 'Triage des symptômes',
  'dashboard.service.triage.description': "Parlez à notre infirmière référente de ce que vous ressentez. Une analyse structurée pour vous guider en toute sécurité.",
  'dashboard.service.triage.cta': 'Ouvrir le service',
  'dashboard.service.sos.title': "SOS d'urgence",
  'dashboard.service.sos.description': "Premiers secours immédiats, localisation d'hôpital et alerte de vos contacts d'urgence. Aucune conversation requise.",
  'dashboard.service.sos.cta': 'Mode actif',

  'dashboard.identity.title': "Aperçu de l'identité",
  'dashboard.identity.edit': 'Modifier le dossier médical',
  'dashboard.identity.bloodGroup': 'Groupe sanguin',
  'dashboard.identity.bmi': 'IMC actuel',
  'dashboard.identity.chronic': 'Maladies chroniques',
  'dashboard.identity.chronicEmpty': 'Aucune maladie enregistrée.',
  'dashboard.identity.medication': 'Traitements en cours',
  'dashboard.identity.medicationEmpty': 'Aucun traitement en cours.',
  'dashboard.identity.lastUpdated': 'Dernière mise à jour',
  'dashboard.identity.notSaved': 'Pas encore enregistré',

  'dashboard.hospital.title': 'Hôpital principal',
  'dashboard.hospital.none': 'Aucun défini',
  'dashboard.hospital.notSet': 'Non défini — à activer dans le Passeport',

  // ── Complete profile wizard ───────────────────────────────────────────────
  'wizard.title': 'Passeport médical',
  'wizard.backToDashboard': 'Retour au tableau de bord',
  'wizard.loading': 'Chargement du dossier médical…',
  'wizard.stepOf': 'Étape {current} sur {total} — {step}',
  'wizard.heroStepOf': 'Étape {current} sur {total}',
  'wizard.next': 'Étape suivante',
  'wizard.back': 'Retour',
  'wizard.finalize': 'Finaliser le passeport',
  'wizard.saving': 'Enregistrement…',
  'wizard.error.identity': 'Veuillez renseigner toutes vos informations personnelles',
  'wizard.error.vitals': 'Veuillez compléter vos constantes',
  'wizard.error.constants': "Impossible de charger les options du formulaire",
  'wizard.error.update': "La mise à jour du dossier a échoué",

  'wizard.step.identity': 'Identité',
  'wizard.step.vitals': 'Constantes',
  'wizard.step.medical': 'Médical',
  'wizard.step.pharmacy': 'Pharmacie',
  'wizard.step.logistics': 'Logistique',

  'wizard.s1.heading': 'Identité personnelle',
  'wizard.s1.phone': 'Numéro de téléphone',
  'wizard.s1.phonePlaceholder': '600-000000',
  'wizard.s1.dob': 'Date de naissance',
  'wizard.s1.gender': 'Sexe',
  'wizard.s1.select': 'Sélectionner',
  'wizard.s1.country': 'Pays',
  'wizard.s1.city': 'Ville',
  // "Langue préférée" est ambigu en français : on peut lire « la langue que je
  // lis l'interface ». L'aide ci-dessous lève l'ambiguïté sans allonger
  // l'étiquette, qui doit rester courte dans une grille de deux colonnes.
  'wizard.s1.preferredLanguage': 'Langue de réponse du médecin IA',
  'wizard.s1.preferredLanguageHelp': "La langue dans laquelle l'assistant vous répondra. Distincte de la langue de l'interface, en haut à droite.",
  'wizard.s1.selectCity': 'Sélectionnez une ville',

  'wizard.s2.heading': 'Profil de santé',
  'wizard.s2.weight': 'Poids (kg)',
  'wizard.s2.height': 'Taille (cm)',
  'wizard.s2.bloodType': 'Groupe sanguin',
  'wizard.s2.smoking': 'Tabagisme',
  'wizard.s2.insurance': "Type d'assurance",

  'wizard.s3.heading': 'Allergies et maladies',
  'wizard.s3.drugAllergies': 'Allergies médicamenteuses',
  'wizard.s3.chronic': 'Maladies chroniques',

  'wizard.s4.heading': 'Traitements en cours',
  'wizard.s4.searchLabel': 'Rechercher un médicament',
  'wizard.s4.searchPlaceholder': 'Rechercher un médicament (ex. Doliprane, Amoxicilline)...',
  'wizard.s4.yourMedications': 'Vos traitements :',
  'wizard.s4.empty': "Aucun traitement ajouté pour l'instant.",
  'wizard.s4.remove': 'Supprimer',

  'wizard.s5.heading': 'Logistique et urgence',
  'wizard.s5.preferredHospital': 'Hôpital préféré',
  'wizard.s5.noCity': 'Aucune ville sélectionnée',
  'wizard.s5.change': 'Modifier',
  'wizard.s5.searchLabel': 'Rechercher un hôpital',
  'wizard.s5.searchPlaceholder': 'Rechercher un hôpital à {city}...',
  'wizard.s5.searchFallbackCity': 'votre ville',
  'wizard.s5.hospitalsIn': 'Hôpitaux à {city}',
  'wizard.s5.gpsText': "Enregistrez votre position GPS pour aider l'agent de localisation à trouver l'aide la plus proche en cas d'urgence.",
  'wizard.s5.locationSaved': 'Position enregistrée',
  'wizard.s5.saveLocation': 'Enregistrer ma position actuelle',

  // ── Emergency contacts (shared by wizard + settings) ──────────────────────
  'contacts.heading': "Contacts d'urgence",
  'contacts.add': 'Ajouter',
  'contacts.addContact': '+ Ajouter un contact',
  'contacts.row': 'Contact {n}',
  'contacts.removeOne': "Supprimer le contact d'urgence {n}",
  'contacts.name': 'Nom',
  'contacts.nameOf': 'Nom du contact {n}',
  'contacts.relationship': 'Lien de parenté',
  'contacts.relationshipOf': 'Lien de parenté du contact {n}',
  'contacts.phone': 'Téléphone',
  'contacts.phoneOf': 'Téléphone du contact {n}',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Gérer le passeport médical',
  'settings.loading': 'Chargement du dossier médical…',
  'settings.saved': 'Passeport médical mis à jour !',
  'settings.error.load': "Impossible de charger les paramètres du dossier",
  'settings.error.update': "La mise à jour a échoué",

  'settings.identity.heading': 'Identité du compte',
  'settings.identity.fullName': 'Nom complet',
  'settings.identity.phone': 'Numéro de téléphone',
  'settings.identity.country': 'Pays',
  'settings.identity.city': 'Ville',

  'settings.conditions.heading': 'Maladies chroniques',
  'settings.conditions.group': 'Maladies chroniques',

  'settings.meds.heading': 'Traitements en cours',
  'settings.meds.searchLabel': 'Rechercher un médicament',
  'settings.meds.searchPlaceholder': 'Rechercher pour ajouter un traitement…',
  'settings.meds.remove': 'Supprimer',
  'settings.meds.confirmRemove': 'Supprimer {name} de votre passeport médical ?',
  'settings.meds.empty': "Aucun traitement enregistré pour l'instant. Recherchez ci-dessus pour en ajouter un — les infirmières voient cette liste lors du triage.",

  'settings.emergency.heading': "Contacts d'urgence",
  'settings.emergency.addContact': '+ Ajouter un contact',

  'settings.saving': 'Enregistrement…',
  'settings.save': 'Enregistrer les modifications',

  // ── Chat / triage ─────────────────────────────────────────────────────────
  'chat.title': 'Triage des symptômes',
  'chat.subtitle': 'Consultation multi-agents · AR · Darija · FR · EN',
  'chat.backToDashboard': 'Retour au tableau de bord',
  'chat.clear': 'Effacer la conversation',
  'chat.confirmClear': 'Effacer toute la conversation ? Cette action est irréversible.',
  'chat.empty.title': 'Décrivez ce que vous ressentez',
  'chat.empty.body': "Écrivez en darija, en arabe, en français ou en anglais. Un agent infirmier vous posera des questions de suivi et fera la synthèse de ce qu'il trouve.",
  'chat.empty.ex1': 'Un mal de tête qui persiste depuis hier',
  'chat.empty.ex2': 'De la fièvre avec une gêne thoracique quand je suis allongé',
  'chat.empty.ex3': "La dose d'insuline que je prends le soir",
  'chat.empty.notEmergency': "Ce service n'est pas un service d'urgence",
  'chat.empty.emergencyText': 'Douleur thoracique, difficultés à respirer, saignement abondant ou perte de connaissance ?',
  'chat.empty.callNow': 'Appelez le {number} maintenant',
  'chat.log': 'Conversation',
  'chat.emergencyDetected': 'Urgence détectée',
  'chat.consulting': 'Consultation des agents…',
  'chat.emergencyTitle': 'Urgence détectée',
  'chat.emergencyBody': "N'attendez pas d'une réponse dans le chat. Appelez maintenant.",
  'chat.call': 'Appeler le {number}',
  'chat.inputLabel': 'Décrivez vos symptômes',
  'chat.inputPlaceholder': 'Décrivez vos symptômes…',
  'chat.send': 'Envoyer',
};
