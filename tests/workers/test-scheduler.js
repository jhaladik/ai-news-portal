  // tests/workers/test-scheduler.js
  export async function testScheduler(endpoint) {
    console.log('Testing Enhanced Scheduler Worker...');
    
    const tests = [
      {
        name: 'Status endpoint responds',
        test: async () => {
          const response = await fetch(endpoint, { method: 'GET' });
          const data = await response.json();
          return {
            pass: response.ok && data.scheduler === 'active',
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Manual trigger works',
        test: async () => {
          const response = await fetch(endpoint, { method: 'POST' });
          const data = await response.json();
          return {
            pass: response.ok && data.success !== undefined,
            data,
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }
  
