/**
 * Agent Chat Test Script
 * Tests all 15 agents with 6 different questions each
 * 
 * Run: node test_all_agents.cjs
 */

const https = require('https');
const http = require('http');

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'https://warmhearted-aardvark-280.convex.cloud';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// All 15 agents with their chat modules and test questions
const AGENTS = [
  {
    id: 'A1',
    name: 'Academic Writer',
    module: 'academic_chat',
    questions: [
      'Hello, I need help with my thesis on renewable energy. Can you assist?',
      'What are your prices for a literature review?',
      'I need APA formatting for my research paper. Do you support that?',
      'How long does it take to complete a dissertation chapter?',
      'Can you help with data analysis using SPSS?',
      'I\'m worried about plagiarism. How do you ensure originality?'
    ]
  },
  {
    id: 'A2',
    name: 'Business Pro',
    module: 'business_chat',
    questions: [
      'Hi, I need help creating a business plan for my startup.',
      'What services do you offer for business consulting?',
      'Can you help me with market research for the Nigerian market?',
      'I need a pitch deck for investors. Can you create one?',
      'What\'s the best strategy for scaling my e-commerce business?',
      'How can I improve my company\'s financial projections?'
    ]
  },
  {
    id: 'A3',
    name: 'Content Pro',
    module: 'content_chat',
    questions: [
      'Hello! I need help creating social media content for my brand.',
      'What types of content can you create?',
      'Can you write blog posts for my website?',
      'How do I create engaging Instagram captions?',
      'I need a content calendar for the next month. Can you help?',
      'What\'s the best content strategy for lead generation?'
    ]
  },
  {
    id: 'A4',
    name: 'Career Pro',
    module: 'career_chat',
    questions: [
      'Hi, I need help updating my resume for a tech job.',
      'Can you help me prepare for a job interview?',
      'What should I include in my LinkedIn profile?',
      'I\'m switching careers from finance to tech. Any advice?',
      'How do I write a compelling cover letter?',
      'Can you review my resume and suggest improvements?'
    ]
  },
  {
    id: 'A5',
    name: 'Personal Shopper',
    module: 'shopping_chat',
    questions: [
      'Hello! I\'m looking for the best laptop under ₦500,000.',
      'Can you compare prices for iPhone 15 across different stores?',
      'I need gift ideas for my wife\'s birthday. Any suggestions?',
      'What\'s the best online store for electronics in Nigeria?',
      'Can you find me the cheapest flight from Lagos to Abuja?',
      'I want to buy furniture for my new apartment. Where should I look?'
    ]
  },
  {
    id: 'A6',
    name: 'Exam Pro',
    module: 'exam_career_chat',
    questions: [
      'Hi, I\'m preparing for JAMB. Can you help me study?',
      'What are the best study techniques for WAEC exams?',
      'Can you create a study schedule for my upcoming exams?',
      'I need practice questions for Mathematics. Can you provide them?',
      'How do I manage exam stress and anxiety?',
      'What resources should I use to prepare for GRE?'
    ]
  },
  {
    id: 'A7',
    name: 'Finance Pro',
    module: 'finance_chat',
    questions: [
      'Hello, I need help creating a personal budget.',
      'What\'s the best investment option in Nigeria right now?',
      'Can you help me understand my tax obligations?',
      'I want to start saving for retirement. Where do I begin?',
      'How do I calculate my monthly cash flow?',
      'Can you help me plan for my child\'s education fund?'
    ]
  },
  {
    id: 'A8',
    name: 'MediaStudio Pro',
    module: 'video_chat',
    questions: [
      'Hi, I need help creating a promotional video for my business.',
      'What video editing software do you recommend?',
      'Can you help me with audio editing for my podcast?',
      'How do I create professional thumbnails for YouTube?',
      'I need a video script for my product launch. Can you write one?',
      'What equipment do I need to start a YouTube channel?'
    ]
  },
  {
    id: 'A9',
    name: 'Wellness Pro',
    module: 'wellness_chat',
    questions: [
      'Hello, I want to start a fitness journey. Where do I begin?',
      'Can you create a meal plan for weight loss?',
      'I\'m feeling stressed. What are some coping strategies?',
      'How much water should I drink daily?',
      'Can you recommend exercises for back pain?',
      'What\'s the best sleep schedule for productivity?'
    ]
  },
  {
    id: 'A10',
    name: 'Home Services',
    module: 'home_chat',
    questions: [
      'Hi, I need help finding a reliable plumber in Lagos.',
      'What should I look for when hiring a painter?',
      'Can you recommend interior designers in my area?',
      'How do I maintain my air conditioning system?',
      'I need electrical work done. How do I find a good electrician?',
      'What\'s the average cost of home renovation in Nigeria?'
    ]
  },
  {
    id: 'A11',
    name: 'Language Tutor',
    module: 'language_chat',
    questions: [
      'Hello, I want to learn French. Can you help?',
      'What\'s the best way to learn a new language?',
      'Can you teach me basic Mandarin phrases?',
      'How long does it take to become fluent in Spanish?',
      'I need help with English grammar. Can you assist?',
      'What language learning apps do you recommend?'
    ]
  },
  {
    id: 'A12',
    name: 'Travel Planner',
    module: 'travel_chat',
    questions: [
      'Hi, I\'m planning a trip to Dubai. Can you help?',
      'What are the best hotels in Abuja for business travelers?',
      'Can you create an itinerary for a week in Ghana?',
      'What documents do I need to travel to the UK?',
      'I want to plan a honeymoon in the Maldives. Any tips?',
      'How do I find cheap flights from Nigeria to the US?'
    ]
  },
  {
    id: 'A13',
    name: 'ServiceMart NG',
    module: 'translation_chat',
    questions: [
      'Hello, I need help with a translation project.',
      'Can you translate my document from English to Yoruba?',
      'I need localization services for my website. Can you help?',
      'What languages do you support for translation?',
      'How much does document translation cost?',
      'I need simultaneous interpretation for a conference. Can you assist?'
    ]
  },
  {
    id: 'A14',
    name: 'Translation Hub',
    module: 'translation_chat',
    questions: [
      'Hi, I need a certified translation of my birth certificate.',
      'Can you translate legal documents from French to English?',
      'What\'s the turnaround time for translation services?',
      'I need technical translation for my user manual. Can you help?',
      'Do you offer notarized translation services?',
      'How do I ensure the translation is accurate?'
    ]
  },
  {
    id: 'A15',
    name: 'Event Planner',
    module: 'event_chat',
    questions: [
      'Hello, I\'m planning a wedding. Can you help with the planning?',
      'What\'s the average cost of a corporate event in Lagos?',
      'Can you recommend venues for a birthday party?',
      'How do I create an event budget?',
      'I need help with event decoration ideas. Any suggestions?',
      'What should I consider when choosing an event date?'
    ]
  }
];

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  errors: [],
  agentResults: {}
};

// Helper function to make HTTP request
function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Check if we have required configuration
if (!CONVEX_URL || CONVEX_URL.includes('your-deployment')) {
  console.error('❌ ERROR: CONVEX_URL is not configured!');
  console.error('   Set VITE_CONVEX_URL in .env.local or pass CONVEX_URL environment variable');
  console.error('   Example: CONVEX_URL=https://warmhearted-aardvark-280.convex.cloud node test_all_agents.cjs');
  process.exit(1);
}

// Test a single agent with a question
async function testAgentQuestion(agent, question, questionIndex) {
  const startTime = Date.now();
  
  try {
    // Create thread
    const createThreadUrl = `${CONVEX_URL}/api/mutation`;
    const createThreadBody = JSON.stringify({
      path: `${agent.module}:createThread`,
      args: {},
      format: "json"
    });
    
    const threadResponse = await makeRequest(createThreadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    }, createThreadBody);
    
    if (!threadResponse.data?.threadId) {
      throw new Error(`Failed to create thread: ${JSON.stringify(threadResponse.data)}`);
    }
    
    const threadId = threadResponse.data.threadId;
    
    // Send message
    const sendMessageUrl = `${CONVEX_URL}/api/mutation`;
    const sendMessageBody = JSON.stringify({
      path: `${agent.module}:sendMessage`,
      args: { prompt: question, threadId },
      format: "json"
    });
    
    const messageResponse = await makeRequest(sendMessageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    }, sendMessageBody);
    
    const duration = Date.now() - startTime;
    
    if (messageResponse.status === 200 && messageResponse.data) {
      return {
        success: true,
        question: question,
        response: messageResponse.data,
        duration,
        threadId
      };
    } else {
      return {
        success: false,
        question: question,
        error: `HTTP ${messageResponse.status}: ${JSON.stringify(messageResponse.data)}`,
        duration
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      question: question,
      error: error.message,
      duration
    };
  }
}

// Test all questions for an agent
async function testAgent(agent) {
  console.log(`\n🤖 Testing Agent: ${agent.name} (${agent.id})`);
  console.log('─'.repeat(50));
  
  const agentResults = {
    id: agent.id,
    name: agent.name,
    questions: [],
    passed: 0,
    failed: 0,
    avgDuration: 0
  };
  
  for (let i = 0; i < agent.questions.length; i++) {
    const question = agent.questions[i];
    console.log(`  Q${i + 1}: ${question.substring(0, 50)}...`);
    
    const result = await testAgentQuestion(agent, question, i);
    agentResults.questions.push(result);
    
    if (result.success) {
      agentResults.passed++;
      console.log(`  ✅ PASS (${result.duration}ms)`);
    } else {
      agentResults.failed++;
      console.log(`  ❌ FAIL (${result.duration}ms): ${result.error?.substring(0, 80)}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  agentResults.avgDuration = Math.round(
    agentResults.questions.reduce((sum, q) => sum + q.duration, 0) / agentResults.questions.length
  );
  
  console.log(`  📊 Results: ${agentResults.passed}/${agent.questions.length} passed, avg ${agentResults.avgDuration}ms`);
  
  return agentResults;
}

// Main test function
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Dutchkem Ventures - Agent Chat Test Suite');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔗 Endpoint: ${CONVEX_URL}`);
  console.log(`🤖 Agents: ${AGENTS.length}`);
  console.log(`❓ Questions per agent: 6`);
  console.log(`📝 Total tests: ${AGENTS.length * 6}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const allResults = [];
  
  for (const agent of AGENTS) {
    const agentResult = await testAgent(agent);
    allResults.push(agentResult);
    results.agentResults[agent.id] = agentResult;
    results.passed += agentResult.passed;
    results.failed += agentResult.failed;
  }
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n🤖 Agent Performance:');
  console.log('─'.repeat(60));
  console.log('Agent ID | Agent Name           | Passed | Failed | Avg Time');
  console.log('─'.repeat(60));
  
  for (const agentResult of allResults) {
    const status = agentResult.failed === 0 ? '✅' : '⚠️';
    console.log(
      `${status} ${agentResult.id.padEnd(8)} | ${agentResult.name.padEnd(20)} | ${String(agentResult.passed).padEnd(6)} | ${String(agentResult.failed).padEnd(6)} | ${agentResult.avgDuration}ms`
    );
  }
  
  console.log('─'.repeat(60));
  console.log(`\n📈 Overall Results:`);
  console.log(`   ✅ Passed: ${results.passed}/${AGENTS.length * 6}`);
  console.log(`   ❌ Failed: ${results.failed}/${AGENTS.length * 6}`);
  console.log(`   📊 Success Rate: ${Math.round((results.passed / (AGENTS.length * 6)) * 100)}%`);
  
  const avgDuration = Math.round(
    allResults.reduce((sum, a) => sum + a.avgDuration, 0) / allResults.length
  );
  console.log(`   ⏱️  Average Response Time: ${avgDuration}ms`);
  
  // Save results to file
  const reportPath = `./test-results-${new Date().toISOString().split('T')[0]}.json`;
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${reportPath}`);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
