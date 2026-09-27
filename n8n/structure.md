Objectif réel

Quand il y a une urgence :

👉 on n’appelle pas
👉 on informe intelligemment le contact d’urgence avec :

pourquoi l’urgence a été déclenchée
la localisation de l’utilisateur
l’hôpital le plus proche
les infos médicales utiles

Backend → n8n → enrichissement (géolocalisation + hôpital) → message complet → WhatsApp (wla backend y3te ta dik geolocation w hospital mn les api nichan ysifto m3a json dles info)

## n8n Emergency Workflow

The `emergency-workflow.json` workflow exposes a `POST /webhook/emergency-alert` endpoint. It expects a request body containing `userId`, `message`, `isEmergency`, `location` (`lat`, `lng`), `emergencyContact`, and `medicalProfile`.

The **Emergency Webhook** node receives the payload and immediately acknowledges the request. The **Is Emergency** node continues only when `body.isEmergency` is the boolean value `true`; all other requests stop there.

For confirmed emergencies, **Find Nearest Hospital** calls the Google Places Nearby Search API with the supplied latitude and longitude. It requests nearby places of type `hospital`, ordered by distance. The Google Maps API key is read from the n8n environment variable `GOOGLE_MAPS_API_KEY`.

**Build Emergency Message** combines the original emergency reason, a Google Maps location link, the first hospital returned by Google, and medical-profile data (allergies, conditions, blood type). It creates one WhatsApp-ready text message and preserves the structured alert data for later nodes.

**Send WhatsApp Emergency Alert** sends that text to `emergencyContact.phone` through Evolution API. It uses `EVOLUTION_API_BASE_URL`, `EVOLUTION_INSTANCE`, and `EVOLUTION_API_KEY` from the n8n environment; no secret is stored in the workflow JSON.

Finally, **Prepare Emergency Log** prepares a structured execution record containing the alert data, selected hospital, recipient phone number, WhatsApp API response, and processing time. It does not write to an external database.
