import { z } from 'zod'

export declare const DeclaredZodSchema: z.ZodObject<
	{
		value: z.ZodNumber
		label: z.ZodOptional<z.ZodString>
	},
	z.core.$strip
>
