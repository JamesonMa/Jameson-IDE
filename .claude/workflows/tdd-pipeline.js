export const meta = {
  name: 'tdd-pipeline',
  description: 'Full TDD workflow: plan -> write tests -> implement -> test -> adaptive review',
  phases: [
    { title: 'Plan', detail: 'Design and identify files' },
    { title: 'Write Tests', detail: 'Generate failing tests' },
    { title: 'Implement', detail: 'Make tests pass' },
    { title: 'Test', detail: 'Run test suite' },
    { title: 'Triage', detail: 'Identify bug risks' },
    { title: 'Review', detail: 'Hunt for bugs' },
  ],
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    goal: { type: 'string' },
    approach: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          purpose: { type: 'string' }
        },
        required: ['path', 'purpose']
      }
    },
    risks: { type: 'array', items: { type: 'string' } }
  },
  required: ['goal', 'approach', 'files']
}

const TEST_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    failures: { type: 'array', items: { type: 'string' } }
  },
  required: ['passed', 'summary']
}

const RISK_SCHEMA = {
  type: 'object',
  properties: {
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['logic', 'boundary', 'concurrency', 'integration', 'error-handling', 'state-management', 'rendering', 'security']
          },
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] }
        },
        required: ['category', 'reason', 'priority']
      }
    }
  },
  required: ['risks']
}

const BUG_SCHEMA = {
  type: 'object',
  properties: {
    bugs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          description: { type: 'string' },
          scenario: { type: 'string' },
          suggestion: { type: 'string' }
        },
        required: ['file', 'severity', 'description', 'scenario']
      }
    }
  },
  required: ['bugs']
}

const REVIEWER_PROMPTS = {
  logic: `Hunt for logic bugs in the changed code:
- Control flow errors (wrong conditions, missing branches, unreachable code)
- State machine bugs (invalid transitions, missing states)
- Off-by-one errors, wrong operators, negation mistakes
- Assumptions that break under edge cases
Return concrete bugs you find, not theoretical risks.`,

  boundary: `Hunt for boundary condition bugs:
- Null/undefined derefs
- Empty array/object access
- Zero/negative numbers where positive expected
- String length assumptions
- Array index out of bounds
Return specific scenarios that would crash or corrupt data.`,

  concurrency: `Hunt for concurrency bugs:
- Race conditions between async operations
- Promise chain errors (unhandled rejections, wrong sequencing)
- Event listener leaks or double-registration
- setState/render timing issues
- File I/O or process spawn races
Return concrete failure scenarios.`,

  integration: `Hunt for integration boundary bugs:
- IPC message format mismatches
- Missing error handlers on IPC channels
- File system operation errors (ENOENT, EACCES, concurrent writes)
- External process spawn/communication failures
- Data serialization issues crossing boundaries
Return specific ways data gets corrupted or lost.`,

  'error-handling': `Hunt for error-path bugs:
- Exceptions that escape and crash
- Missing cleanup in error cases (leaked handles, temp files)
- Partial failures leaving inconsistent state
- Silent failures (caught but not logged/handled)
- Error messages that expose sensitive data
Return scenarios where errors cause corruption or crashes.`,

  'state-management': `Hunt for state management bugs:
- State updates that don't trigger re-renders
- Stale closure captures
- Shared mutable state without synchronization
- State reset/initialization errors
- State leaking between sessions/windows
Return bugs that cause UI desync or data loss.`,

  rendering: `Hunt for rendering bugs:
- Re-render loops or performance cliffs
- DOM refs accessed after unmount
- Keys causing incorrect reconciliation
- Layout thrashing or forced reflows
- Memory leaks from retained references
Return bugs that freeze, crash, or corrupt the UI.`,

  security: `Hunt for security bugs:
- XSS via unsanitized user input in DOM
- Command injection in shell exec
- Path traversal in file operations
- Exposed secrets or credentials
- Missing auth/authorization checks
Return concrete exploit scenarios.`
}

// Require user request in args
if (!args || !args.request) {
  throw new Error('Missing args.request - pass the feature request as {request: "..."}')
}

phase('Plan')
log('Designing implementation strategy...')

const plan = await agent(`Design an implementation plan for: ${args.request}

Analyze the codebase and provide:
- Clear goal statement
- High-level approach (architecture, patterns)
- Files to create/modify with purpose for each
- Known risks or edge cases

Be specific about file paths and concrete steps.`, {
  label: 'design-plan',
  schema: PLAN_SCHEMA
})

log(`Plan: ${plan.files.length} files identified`)

phase('Write Tests')
log('Writing test cases based on plan...')

const testAgent = await agent(`Based on this plan:
Goal: ${plan.goal}
Approach: ${plan.approach}
Files: ${plan.files.map(f => `${f.path} - ${f.purpose}`).join('\n')}

Write comprehensive test cases that should FAIL initially:
- Cover happy path, edge cases, error conditions
- Use the project's existing test framework
- Follow existing test patterns in the codebase
- Focus on behavior, not implementation details

Create test files with clear assertions.`, {
  label: 'write-tests',
  agentType: 'general-purpose'
})

phase('Implement')
log('Implementing to make tests pass...')

const implAgent = await agent(`Implement the feature to make the tests pass:
Goal: ${plan.goal}
Approach: ${plan.approach}
Files: ${plan.files.map(f => `${f.path} - ${f.purpose}`).join('\n')}

Follow the plan, match existing code style, and make all tests pass.
Do NOT modify tests - only implement the feature code.`, {
  label: 'implement',
  agentType: 'general-purpose'
})

phase('Test')
log('Running test suite...')

const testResult = await agent(`Run the test suite and report results:
- Execute the project's test command
- Report pass/fail status
- List any failing tests with error messages
- Verify the new tests are included in the run

Return structured test results.`, {
  label: 'run-tests',
  schema: TEST_RESULT_SCHEMA
})

if (!testResult.passed) {
  log(`Tests FAILED: ${testResult.failures.length} failures`)
  return {
    status: 'tests-failed',
    plan: plan,
    testResult: testResult,
    message: 'Implementation did not pass tests. Review failures and iterate.'
  }
}

log('Tests PASSED - proceeding to review')

phase('Triage')
log('Analyzing changes for bug risks...')

const triage = await agent(`Read the git diff of all changes made and identify which bug categories are most likely.

For each risk:
- Pick from: logic, boundary, concurrency, integration, error-handling, state-management, rendering, security
- Explain WHY this category is relevant to the actual changes
- Mark priority: high (critical/complex), medium (moderate), low (simple)

Return 2-5 risks.`, {
  label: 'triage-diff',
  schema: RISK_SCHEMA
})

const risks = triage.risks.filter(r => r.priority === 'high' || r.priority === 'medium')

if (!risks.length) {
  log('No significant risks - changes appear low-risk')
  return {
    status: 'success',
    plan: plan,
    testResult: testResult,
    bugs: [],
    message: 'Feature implemented and tested. No high-risk bug patterns detected.'
  }
}

log(`${risks.length} risk areas: ${risks.map(r => r.category).join(', ')}`)

phase('Review')
log(`Spawning ${risks.length} specialized bug hunters...`)

const bugResults = await parallel(risks.map(risk => () =>
  agent(REVIEWER_PROMPTS[risk.category], {
    label: `review-${risk.category}`,
    phase: 'Review',
    schema: BUG_SCHEMA
  })
))

const allBugs = bugResults
  .filter(Boolean)
  .flatMap(r => r.bugs)
  .sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

log(`Review complete: ${allBugs.length} potential bugs found`)

return {
  status: allBugs.length > 0 ? 'bugs-found' : 'success',
  plan: plan,
  testResult: testResult,
  risks: risks.map(r => ({ category: r.category, reason: r.reason })),
  bugs: allBugs,
  summary: `Feature implemented, tests pass. ${allBugs.length} bugs found in review across ${risks.length} categories.`
}
