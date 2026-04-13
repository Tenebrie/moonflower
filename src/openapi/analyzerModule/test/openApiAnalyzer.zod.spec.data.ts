import { expectTypeOf } from 'vitest'
import { z } from 'zod'
import { z as valibot } from 'zod'

import { usePathParams } from '../../../hooks/usePathParams'
import { useRequestBody } from '../../../hooks/useRequestBody'
import { Router } from '../../../router/Router'
import { OptionalParam } from '../../../validators/ParamWrappers'
import { TestCase } from './TestCase'

const router = new Router()

router.post(`/test/${TestCase.parsesInlineZodNumber}/:id`, (ctx) => {
	usePathParams(ctx, {
		id: z.number(),
	})

	useRequestBody(ctx, {
		data: z.number(),
	})
})

router.post(`/test/${TestCase.parsesInlineZodString}/:id`, (ctx) => {
	usePathParams(ctx, {
		id: z.string(),
	})

	useRequestBody(ctx, {
		data: z.string(),
	})
})

router.post(`/test/${TestCase.parsesInlineZodObject}/:id`, (ctx) => {
	usePathParams(ctx, {
		id: z.object({
			value: z.number(),
		}),
	})

	useRequestBody(ctx, {
		data: z.object({
			value: z.number(),
		}),
	})
})

router.post(`/test/${TestCase.parsesInlineZodNumberArray}/:id`, (ctx) => {
	usePathParams(ctx, {
		id: z.array(z.number()),
	})

	useRequestBody(ctx, {
		data: z.array(z.number()),
	})
})

router.post(`/test/${TestCase.parsesInlineZodObjectArray}/:id`, (ctx) => {
	usePathParams(ctx, {
		id: z.array(
			z.object({
				value: z.number(),
			}),
		),
	})

	useRequestBody(ctx, {
		data: z.array(
			z.object({
				value: z.number(),
			}),
		),
	})
})

router.post(`/test/${TestCase.parsesAliasedZodSchema}/:id`, (ctx) => {
	const schema = valibot.array(
		valibot.object({
			value: valibot.number(),
		}),
	)

	usePathParams(ctx, {
		id: schema,
	})

	useRequestBody(ctx, {
		data: schema,
	})
})

router.post(`/test/${TestCase.parsesInlineZodEnum}/:direction`, (ctx) => {
	const MindmapLinkDirection = {
		Normal: 'Normal',
		Reversed: 'Reversed',
	} as const

	type MindmapLinkDirection = (typeof MindmapLinkDirection)[keyof typeof MindmapLinkDirection]

	const path = usePathParams(ctx, {
		direction: z.enum(MindmapLinkDirection),
	})
	const body = useRequestBody(ctx, {
		direction: z.enum(MindmapLinkDirection),
		optionalDirection: OptionalParam(z.enum(MindmapLinkDirection)),
	})

	expectTypeOf(path.direction).toEqualTypeOf<MindmapLinkDirection>()
	expectTypeOf(body.direction).toEqualTypeOf<MindmapLinkDirection>()
	expectTypeOf(body.optionalDirection).toEqualTypeOf<MindmapLinkDirection | undefined>()
})

router.post(`/test/${TestCase.parsesZodOptional}`, (ctx) => {
	useRequestBody(ctx, {
		requiredField: z.string(),
		optionalField: z.string().optional(),
		optionalNumber: z.number().optional(),
	})
})
