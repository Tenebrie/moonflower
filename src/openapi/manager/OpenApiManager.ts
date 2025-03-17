import { Router } from '../../router/Router'
import { EndpointData, ExposedModelData } from '../types'

type UrlType = `${'http' | 'https'}://${string}.${string}`

export type ApiDocsHeader = {
	title: string
	version: string
	description?: string
	termsOfService?: UrlType
	contact?: {
		name?: string
		url?: UrlType
		email?: string
	}
	license?: {
		name?: string
		url?: UrlType
	}
}

export type ApiDocsPreferences = {
	allowOptionalPathParams: boolean
}

export type ApiAnalysisStats = {
	explicitRouterFiles: {
		path: string
		routers: {
			name: string
			endpoints: string[]
		}[]
	}[]
	discoveredRouterFiles: {
		path: string
		routers: {
			name: string
			endpoints: string[]
		}[]
	}[]
}

export class OpenApiManager {
	private static instance: OpenApiManager | null = null

	private isInitialized = false
	private registeredRouters: Router[] = []

	constructor(
		private apiDocsHeader: ApiDocsHeader,
		private exposedModels: ExposedModelData[],
		private endpoints: EndpointData[],
		private preferences: ApiDocsPreferences,
		private stats: ApiAnalysisStats,
	) {}

	public isReady(): boolean {
		return this.isInitialized
	}

	public hasExposedModel(name: string) {
		return this.exposedModels.some((model) => model.name === name)
	}

	public getExposedModels() {
		return this.exposedModels
	}

	public setExposedModels(models: ExposedModelData[]) {
		this.exposedModels = models
		return this
	}

	public setEndpoints(endpoints: EndpointData[]) {
		this.endpoints = endpoints
		return this
	}

	public markAsReady() {
		this.isInitialized = true
		return this
	}

	public getHeader(): ApiDocsHeader {
		return this.apiDocsHeader
	}

	public setHeader(docs: ApiDocsHeader) {
		this.apiDocsHeader = docs
		return this
	}

	public getEndpoints() {
		return this.endpoints
	}

	public getPreferences() {
		return this.preferences
	}

	public setPreferences(preferences: ApiDocsPreferences) {
		this.preferences = {
			...preferences,
		}
		return this
	}

	public getStats() {
		return this.stats
	}

	public setStats(stats: ApiAnalysisStats) {
		this.stats = {
			...stats,
		}
		return this
	}

	public getRouters(): readonly Router[] {
		return this.registeredRouters
	}

	public registerRouters(routers: Router<any, any>[]) {
		routers.forEach((r) => this.registeredRouters.push(r))
		return this
	}

	public reset() {
		this.exposedModels = []
		this.endpoints = []
	}

	public static getInstance() {
		if (!OpenApiManager.instance) {
			OpenApiManager.instance = new OpenApiManager(
				{
					title: 'Default title',
					version: '1.0.0',
				},
				[],
				[],
				{
					allowOptionalPathParams: false,
				},
				{
					discoveredRouterFiles: [],
					explicitRouterFiles: [],
				},
			)
		}
		return OpenApiManager.instance
	}
}
