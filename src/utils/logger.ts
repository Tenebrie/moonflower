const levelToNumber = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	silent: 4,
}

const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
}

const formatMessage = (level: string, message: string) => {
	const levelColors = {
		error: colors.red,
		warn: colors.yellow,
		info: colors.white,
		debug: colors.dim,
	}

	const levelColor = levelColors[level as keyof typeof levelColors] || colors.white
	return `${colors.magenta}${colors.bright}[Moonflower]${colors.reset} ${levelColor}${message}${colors.reset}`
}

export const Logger = {
	_level: levelToNumber.warn,
	setLevel: (level: 'debug' | 'info' | 'warn' | 'error' | 'silent') => {
		Logger._level = levelToNumber[level]
	},

	debug: (message: string, ...args: unknown[]) => {
		if (Logger._level > levelToNumber.debug) return
		console.debug(formatMessage('debug', message), ...args)
	},
	info: (message: string, ...args: unknown[]) => {
		if (Logger._level > levelToNumber.info) return
		console.info(formatMessage('info', message), ...args)
	},
	warn: (message: string, ...args: unknown[]) => {
		if (Logger._level > levelToNumber.warn) return
		console.warn(formatMessage('warn', message), ...args)
	},
	error: (message: string, ...args: unknown[]) => {
		if (Logger._level > levelToNumber.error) return
		console.error(formatMessage('error', message), ...args)
	},
}

export function formatTimestamp(timestamp: number) {
	const date = new Date(timestamp)
	return date
		.toLocaleString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		})
		.replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6')
}
