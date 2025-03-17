/* eslint-disable @typescript-eslint/ban-ts-comment */
export type RemoveFirstFromTuple<T extends any[]> = T['length'] extends 0
	? undefined
	: ((...b: T) => void) extends (a: infer Q, ...b: infer I) => void
		? I
		: []

export type SplitStringBy<S extends string, D extends string> = string extends S
	? string[]
	: S extends ''
		? []
		: S extends `${infer T}${D}${infer U}`
			? [T, ...SplitStringBy<U, D>]
			: [S]

type PickParams<S extends string[], P extends string> = S['length'] extends 0
	? []
	: S[0] extends `${P}${string}`
		? // @ts-ignore
			[S[0], ...PickParams<RemoveFirstFromTuple<S>, P>]
		: // @ts-ignore
			PickParams<RemoveFirstFromTuple<S>, P>

export type Substring<S extends string[]> = S['length'] extends 0
	? []
	: // @ts-ignore
		[SplitStringBy<S[0], ':'>[1], ...Substring<RemoveFirstFromTuple<S>>]

export type ExtractedRequestParams<S extends string> = {
	parsedPathParams: PickParams<SplitStringBy<S, '/'>, ':'>
}

export type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
	? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
	: S extends `${infer P1}-${infer P2}${infer P3}`
		? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
		: S

export type KeysToCamelCase<T> = {
	[K in keyof T as CamelCase<string & K>]: T[K] extends Record<any, any> ? KeysToCamelCase<T[K]> : T[K]
}

type RemoveLeadingColon<S extends string> = S['length'] extends 0 ? never : SplitStringBy<S, ':'>[1]
type RemoveTrailingQuestion<S extends string> = S['length'] extends 0 ? never : SplitStringBy<S, '?'>[0]
export type CleanUpPathParam<S> = S extends string
	? //@ts-ignore
		RemoveLeadingColon<RemoveTrailingQuestion<S>> extends string
		? //@ts-ignore
			RemoveLeadingColon<RemoveTrailingQuestion<S>>
		: ''
	: never
