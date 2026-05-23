import { Node, Project, ts } from 'ts-morph'
import { parentPort } from 'worker_threads'

import { parseEndpoint } from './parseEndpoint'
import { WorkerResult, WorkerTask } from './workerPool'

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

		const routerPattern = new RegExp(`${task.routerName}\\.(?:${OPERATIONS_PATTERN})`)
		let index = 0
		let targetNode: Node<ts.Node> | undefined

		sourceFile.forEachChild((node) => {
			if (targetNode) return
			if (routerPattern.test(node.getText())) {
				if (index === task.endpointIndex) {
					targetNode = node
				}
				index++
			}
		})

		if (!targetNode) {
			const result: WorkerResult = {
				taskId: task.taskId,
				error: `Endpoint not found: routerName=${task.routerName} index=${task.endpointIndex} in ${task.sourceFilePath}`,
			}
			parentPort!.postMessage(result)
			return
		}

		const t1 = performance.now()
		const { endpoint, sectionTimings } = parseEndpoint(targetNode, task.sourceFilePath)

		const result: WorkerResult = {
			taskId: task.taskId,
			endpoint,
			sectionTimings,
			timing: performance.now() - t1,
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
