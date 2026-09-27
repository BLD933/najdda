require('dotenv').config();
const DrugSafetyService = require('./src/core/services/DrugSafetyService');

async function test() {
  const result = await DrugSafetyService.checkInteraction({
    message: "I am taking Aspirin and Warfarin together. Is this safe?",
    medications: ["Aspirin", "Warfarin"]
  });
  console.log(JSON.stringify(result, null, 2));
}
test();
