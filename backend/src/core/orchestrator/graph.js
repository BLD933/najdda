const { StateGraph, START, END } = require('@langchain/langgraph');
const { OrchestratorState } = require('./orchestratorState');
const { routerNode } = require('./nodes/routerNode');
const { agentRouterNode } = require('./nodes/agentNodes');
const { synthesisNode } = require('./nodes/synthesisNode');

async function buildOrchestrator() {
  const workflow = new StateGraph(OrchestratorState)
    .addNode('router', routerNode)
    .addNode('agents', agentRouterNode)
    .addNode('synthesis', synthesisNode)
    .addEdge(START, 'router')
    .addEdge('router', 'agents')
    .addEdge('agents', 'synthesis')
    .addEdge('synthesis', END);

  const app = workflow.compile();
  return app;
}

let compiledGraph = null;

async function getOrchestrator() {
  if (!compiledGraph) {
    compiledGraph = await buildOrchestrator();
  }
  return compiledGraph;
}

async function runOrchestrator(input) {
  const graph = await getOrchestrator();
  const result = await graph.invoke(input);
  return result;
}

module.exports = { buildOrchestrator, getOrchestrator, runOrchestrator };
