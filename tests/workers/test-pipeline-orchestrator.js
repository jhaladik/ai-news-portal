  // tests/workers/test-pipeline-orchestrator.js
  export async function testPipelineOrchestrator(endpoint) {
    console.log('Testing Pipeline Orchestrator Worker...');
    
    const tests = [
      {
        name: 'Execute collect mode',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'collect' })
          });
          const data = await response.json();
          return {
            pass: response.ok && data.pipeline_run_id && data.collected >= 0,
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Execute full pipeline',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'full' })
          });
          const data = await response.json();
          return {
            pass: response.ok && data.pipeline_run_id && data.completed_at,
            data,
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }