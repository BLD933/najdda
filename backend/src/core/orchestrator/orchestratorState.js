const { Annotation, messagesStateReducer } = require('@langchain/langgraph');

const OrchestratorState = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  patientProfile: Annotation({
    reducer: (a, b) => b || a,
    default: () => ({}),
  }),
  userMessage: Annotation({
    reducer: (a, b) => b || a,
    default: () => '',
  }),
  domain: Annotation({
    reducer: (a, b) => b || a,
    default: () => null,
  }),
  activeAgents: Annotation({
    reducer: (a, b) => b || a,
    default: () => [],
  }),
  subAgentResponses: Annotation({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  finalResponse: Annotation({
    reducer: (a, b) => b || a,
    default: () => null,
  }),
  errors: Annotation({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),
});

module.exports = { OrchestratorState };
