// tests/workers/test-rss-collect.js
export async function testRSSCollect(endpoint) {
    console.log('Testing RSS Collection Worker...');
    
    const tests = [
      {
        name: 'Basic RSS collection',
        test: async () => {
          const response = await fetch(endpoint, { method: 'POST' });
          const data = await response.json();
          return {
            pass: response.ok && data.collected >= 0,
            data,
            response: response.status
          };
        }
      },
      {
        name: 'CORS headers present',
        test: async () => {
          const response = await fetch(endpoint, { method: 'OPTIONS' });
          return {
            pass: response.headers.get('Access-Control-Allow-Origin') === '*',
            data: Object.fromEntries(response.headers.entries()),
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }
  
  
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
  
