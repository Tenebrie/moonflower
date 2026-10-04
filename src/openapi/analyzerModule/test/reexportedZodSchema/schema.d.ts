import { z } from 'zod'

export declare const ReexportedZodSchema: z.ZodObject<
	{
		value: z.ZodNumber
		label: z.ZodOptional<z.ZodString>
	},
	z.core.$strip
>
