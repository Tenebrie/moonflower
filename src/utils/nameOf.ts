export interface ClassConstructor {
	new (): unknown
}

export const nameOf = <T extends ClassConstructor | (() => unknown)>(a: T) => {
	return a.name
}
