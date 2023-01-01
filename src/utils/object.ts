export const keysOf = <T extends string | number | symbol>(object: Record<T, unknown>) => {
	return Object.keys(object) as (keyof typeof object)[]
}

export const uncapitalize = (value: string) => `${value.substring(0, 1).toLowerCase()}${value.substring(1)}`

export const snakeToCamelCase = (value: string) => {
	return value.replace(/(?!^)_(.)/g, (_, char) => char.toUpperCase())
}

export const kebabToCamelCase = (value: string) => {
	return value.replace(/(?!^)-(.)/g, (_, char) => char.toUpperCase())
}

export const camelToSnakeCase = (value: string) => value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)

export const camelToKebabCase = (value: string) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
