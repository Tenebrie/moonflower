import { camelToKebabCase, camelToSnakeCase, snakeToCamelCase, uncapitalize } from './object'

describe('object utilities', () => {
	describe('uncapitalize', () => {
		it('uncapitalizes string correctly', () => {
			expect(uncapitalize('CapitalizedString')).toEqual('capitalizedString')
		})
	})

	describe('snakeToCamelCase', () => {
		it('transforms snake_case string correctly', () => {
			expect(snakeToCamelCase('snake_case_string')).toEqual('snakeCaseString')
		})

		it('transforms Capitalized_Snake_Case string correctly', () => {
			expect(snakeToCamelCase('Snake_Case_String')).toEqual('snakeCaseString')
		})
	})

	describe('camelToSnakeCase', () => {
		it('transforms camelCase string correctly', () => {
			expect(camelToSnakeCase('camelCaseString')).toEqual('camel_case_string')
		})

		it('transforms CapitalizedCamelCase string correctly', () => {
			expect(camelToSnakeCase('CamelCaseString')).toEqual('camel_case_string')
		})
	})

	describe('camelToKebabCase', () => {
		it('transforms camelCase string correctly', () => {
			expect(camelToKebabCase('camelCaseString')).toEqual('camel-case-string')
		})
	})
})
