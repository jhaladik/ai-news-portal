  // tests/workers/test-content-publish.js
  export async function testContentPublish(endpoint) {
    console.log('Testing Content Publishing Worker...');
    
    const tests = [
      {
        name: 'Rejects missing content ID',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          return {
            pass: response.status === 400,
            data: await response.json(),
            response: response.status
          };
        }
      },
      {
        name: 'Rejects non-existent content',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content_id: 'non-existent-' + Date.now() })
          });
          return {
            pass: response.status === 404,
            data: await response.json(),
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }
  
