  // tests/workers/test-admin-review.js
  export async function testAdminReview(endpoint) {
    console.log('Testing Enhanced Admin Review Worker...');
    
    const tests = [
      {
        name: 'Get review queue',
        test: async () => {
          const response = await fetch(endpoint, { method: 'GET' });
          const data = await response.json();
          return {
            pass: response.ok && Array.isArray(data.queue) && data.insights,
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Get category insights',
        test: async () => {
          const response = await fetch(endpoint + '?action=insights', { method: 'GET' });
          const data = await response.json();
          return {
            pass: response.ok && Array.isArray(data.insights),
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Batch approve validation',
        test: async () => {
          const response = await fetch(endpoint + '?action=batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Missing content_ids
          });
          return {
            pass: response.status === 400,
            data: await response.json(),
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }
  
  // Test runner utility
  async function runTests(tests) {
    const results = { passed: 0, failed: 0, total: tests.length, details: [] };
    
    for (const test of tests) {
      try {
        const result = await test.test();
        if (result.pass) {
          results.passed++;
          results.details.push({ name: test.name, status: 'PASS', data: result.data });
          console.log(`✅ ${test.name}`);
        } else {
          results.failed++;
          results.details.push({ name: test.name, status: 'FAIL', data: result.data, response: result.response });
          console.log(`❌ ${test.name} (HTTP ${result.response})`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({ name: test.name, status: 'ERROR', error: error.message });
        console.log(`💥 ${test.name}: ${error.message}`);
      }
    }
    
    return results;
  }
  
  // Main test runner for all workers
  export async function runAllWorkerTests(baseUrl = 'jhaladik.workers.dev') {
    const workers = [
      { name: 'RSS Collect', test: testRSSCollect, endpoint: `https://rss-collect.${baseUrl}` },
      { name: 'AI Score', test: testAIScore, endpoint: `https://ai-data-score.${baseUrl}` },
      { name: 'AI Validate', test: testAIValidate, endpoint: `https://ai-validate-enhanced.${baseUrl}` },
      { name: 'Content Publish', test: testContentPublish, endpoint: `https://content-publish.${baseUrl}` },
      { name: 'Pipeline Orchestrator', test: testPipelineOrchestrator, endpoint: `https://pipeline-orchestrator.${baseUrl}` },
      { name: 'AI Generate', test: testAIGenerate, endpoint: `https://ai-generate-enhanced.${baseUrl}` },
      { name: 'Scheduler', test: testScheduler, endpoint: `https://scheduler-daily-enhanced.${baseUrl}` },
      { name: 'Admin Review', test: testAdminReview, endpoint: `https://admin-review-enhanced.${baseUrl}` }
    ];
  
    const allResults = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
  
    console.log('🧪 Running All Phase 2b Worker Tests\n');
  
    for (const worker of workers) {
      console.log(`\n📋 Testing ${worker.name}...`);
      try {
        const result = await worker.test(worker.endpoint);
        allResults[worker.name] = result;
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTests += result.total;
        
        console.log(`   ${result.passed}/${result.total} tests passed`);
      } catch (error) {
        console.log(`   ❌ Failed to test ${worker.name}: ${error.message}`);
        totalFailed++;
        totalTests++;
      }
    }
  
    console.log('\n📊 Overall Test Results');
    console.log('=======================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} ✅`);
    console.log(`Failed: ${totalFailed} ❌`);
    console.log(`Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
  
    return allResults;
  }