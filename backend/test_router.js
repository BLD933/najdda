require('dotenv').config();
const { routerNode } = require('./src/core/orchestrator/nodes/routerNode');

async function test() {
  const state = {
    userMessage: "My 4-year-old son has a fever of 39°C. He is currently taking Amoxicillin for an ear infection. Can I give him Advil to lower the fever? Answer me in Arabic",
    patientProfile: { age: 30 },
    messages: []
  };
  const result = await routerNode(state);
  console.log(JSON.stringify(result, null, 2));
}
test();
