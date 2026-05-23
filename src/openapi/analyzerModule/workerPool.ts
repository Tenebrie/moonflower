import os from 'os'
import { Worker } from 'worker_threads'

import { EndpointData } from '../types'
import { SectionTiming } from './parseEndpoint'

export type WorkerTask = {
	taskId: string
	tsconfigPath: string
	sourceFilePath: string
	routerName: string
	endpointIndex: number
}

export type WorkerResultSuccess = {
	taskId: string
	endpoint: EndpointData
	sectionTimings: SectionTiming[]
	timing: number
}

export type WorkerResultError = {
	taskId: string
	error: string
}

export type WorkerResult = WorkerResultSuccess | WorkerResultError

export class WorkerPool {
	private workers: Worker[]
	private idle: Worker[]
	private queue: Array<{ task: WorkerTask; resolve: (r: WorkerResult) => void }> = []
	private pending = new Map<string, (r: WorkerResult) => void>()

	constructor(workerUrl: URL) {
		const size = Math.max(1, Math.min(os.cpus().length - 1, 8))
		this.workers = Array.from({ length: size }, () => {
			const worker = new Worker(workerUrl)
			worker.on('message', (result: WorkerResult) => {
				const resolve = this.pending.get(result.taskId)
				if (resolve) {
					this.pending.delete(result.taskId)
					resolve(result)
				}
				this.idle.push(worker)
				this.flush()
			})
			worker.on('error', (err) => {
				// Find any pending task for this worker and reject it
				// (worker crashed — shouldn't happen, but handle gracefully)
				for (const [taskId, resolve] of this.pending) {
					resolve({ taskId, error: String(err) })
					this.pending.delete(taskId)
					break
				}
				this.idle.push(worker)
				this.flush()
			})
			return worker
		})
		this.idle = [...this.workers]
	}

	run(task: WorkerTask): Promise<WorkerResult> {
		return new Promise((resolve) => {
			if (this.idle.length > 0) {
				const worker = this.idle.pop()!
				this.pending.set(task.taskId, resolve)
				worker.postMessage(task)
			} else {
				this.queue.push({ task, resolve })
			}
		})
	}

	runAll(tasks: WorkerTask[]): Promise<WorkerResult[]> {
		return Promise.all(tasks.map((t) => this.run(t)))
	}

	terminate() {
		this.workers.forEach((w) => w.terminate())
	}

	private flush() {
		while (this.queue.length > 0 && this.idle.length > 0) {
			const { task, resolve } = this.queue.shift()!
			const worker = this.idle.pop()!
			this.pending.set(task.taskId, resolve)
			worker.postMessage(task)
		}
	}
}
