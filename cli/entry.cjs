#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const tsnode = require('ts-node')
tsnode.register({
	lazy: true,
	transpileOnly: true,
})

require('./cli')
