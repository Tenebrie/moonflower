import { Project } from 'ts-morph'
import { parentPort } from 'worker_threads'

import { EndpointData } from '../types'
import { resolveEndpointPath } from './nodeParsers'
import { parseEndpoint } from './parseEndpoint'
import { EndpointTiming, WorkerResult, WorkerTask } from './workerPool'

const OPERATIONS = ['get', 'post', 'put', 'delete', 'del', 'patch']
const OPERATIONS_PATTERN = OPERATIONS.join('|')

let project: Project | null = null
let currentTsconfigPath: string | null = null

function getProject(tsconfigPath: string): Project {
	if (!project || currentTsconfigPath !== tsconfigPath) {
		project = new Project({
			tsConfigFilePath: tsconfigPath,
			skipFileDependencyResolution: true,
		})
		currentTsconfigPath = tsconfigPath
	}
	return project
}

parentPort!.on('message', (task: WorkerTask) => {
	try {
		const proj = getProject(task.tsconfigPath)

		let sourceFile = proj.getSourceFile(task.sourceFilePath)
		if (!sourceFile) {
			sourceFile = proj.addSourceFileAtPath(task.sourceFilePath)
		}

		const endpoints: EndpointData[] = []
		const endpointTimings: EndpointTiming[] = []

		task.routerNames.forEach((routerName) => {
			const routerPattern = new RegExp(`${routerName}\\.(?:${OPERATIONS_PATTERN})`)
			sourceFile!.forEachChild((node) => {
				if (!routerPattern.test(node.getText())) {
					return
				}

				if (task.filterEndpointPaths) {
					const endpointPath = resolveEndpointPath(node) ?? ''
					if (!task.filterEndpointPaths.some((p) => endpointPath.includes(p))) {
						return
					}
				}

				const t1 = performance.now()
				const { endpoint, sectionTimings } = parseEndpoint(node, task.sourceFilePath)
				endpointTimings.push({
					method: endpoint.method,
					path: endpoint.path,
					timing: performance.now() - t1,
					sectionTimings,
				})
				endpoints.push(endpoint)
			})
		})

		const result: WorkerResult = {
			taskId: task.taskId,
			endpoints,
			endpointTimings,
		}
		parentPort!.postMessage(result)
	} catch (err) {
		const result: WorkerResult = {
			taskId: task.taskId,
			error: String(err),
		}
		parentPort!.postMessage(result)
	}
})
