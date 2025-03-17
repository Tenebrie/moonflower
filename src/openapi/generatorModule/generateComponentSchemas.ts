import { ExposedModelData } from '../types'
import { getSchema, SchemaType } from './getSchema'

export const generateComponentSchemas = (models: ExposedModelData[]) => {
	const schemas: Record<string, SchemaType> = {}

	models.forEach((model) => {
		schemas[model.name] = getSchema(model.shape)
	})
	return schemas
}
