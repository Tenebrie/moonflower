import { z } from 'zod'
import { z as valibot } from 'zod'

import { usePathParams } from '../../../hooks/usePathParams'
import { useRequestBody } from '../../../hooks/useRequestBody'
import { Router } from '../../../router/Router'
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

router.post(`/test/${TestCase.parsedAliasedZodSchema}/:id`, (ctx) => {
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
