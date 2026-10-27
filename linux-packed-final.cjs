const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const prefix = '/evidence/linux-packed-configured'
const startedAt = new Date().toISOString()
const fd = fs.openSync(prefix + '-run.log', 'w')
const p = spawnSync(process.execPath, ['/evidence/packed-probe.cjs', '/ram/consumer', prefix], { cwd: '/ram/consumer', stdio: ['ignore', fd, fd] })
fs.closeSync(fd)
const report = fs.existsSync(prefix + '.json') ? JSON.parse(fs.readFileSync(prefix + '.json')) : null
fs.writeFileSync(prefix + '-done.json', JSON.stringify({ command: [process.execPath, '/evidence/packed-probe.cjs', '/ram/consumer', prefix], code: p.status, reportPresent: !!report, passed: report && report.passed, startedAt, finishedAt: new Date().toISOString() }, null, 2))
