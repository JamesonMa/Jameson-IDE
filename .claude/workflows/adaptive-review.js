export const meta = {
  name: 'adaptive-review',
  description: 'Adaptive bug-hunting review - spawns specialized reviewers based on changed code',
  phases: [
    { title: 'Triage', detail: 'Analyze diff and identify risk areas' },
    { title: 'Review', detail: 'Parallel specialized bug hunters' },
    { title: 'Report', detail: 'Aggregate findings' },
  ],
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

phase('Triage')
log('Analyzing diff to identify risk areas...')

const triage = await agent(`Read the git diff and identify which categories of bugs are most likely given the changed code.

For each risk you identify:
- Pick the most specific category from: logic, boundary, concurrency, integration, error-handling, state-management, rendering, security
- Explain WHY this category is relevant to the actual changes
- Mark priority: high (changes touch critical paths or complex logic), medium (moderate complexity), low (simple/isolated changes)

Return 2-5 risks, prioritized by likelihood of actual bugs.`, {
  label: 'triage-diff',
  schema: RISK_SCHEMA
})

const risks = triage.risks.filter(r => r.priority === 'high' || r.priority === 'medium')

if (!risks.length) {
  log('No significant risk areas identified - changes appear low-risk')
  return { bugs: [], message: 'No high/medium risk areas found in changes' }
}

log(`Identified ${risks.length} risk areas: ${risks.map(r => r.category).join(', ')}`)

phase('Review')
log(`Spawning ${risks.length} specialized reviewers in parallel...`)

const results = await parallel(risks.map(risk => () =>
  agent(REVIEWER_PROMPTS[risk.category], {
    label: `review-${risk.category}`,
    phase: 'Review',
    schema: BUG_SCHEMA
  })
))

const allBugs = results
  .filter(Boolean)
  .flatMap(r => r.bugs)
  .sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

phase('Report')
log(`Found ${allBugs.length} potential bugs`)

return {
  risks: risks.map(r => ({ category: r.category, reason: r.reason })),
  bugs: allBugs,
  summary: `${allBugs.length} bugs found across ${risks.length} risk categories`
}
