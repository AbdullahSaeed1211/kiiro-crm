import type { Field } from 'payload'

export const configRelation = (name: string, relationTo: string, options: Record<string, unknown> = {}): Field => ({
  name,
  type: 'relationship',
  relationTo,
  ...options,
})

export const configText = (name: string, options: Record<string, unknown> = {}): Field => ({
  name,
  type: 'text',
  ...options,
})

export const configJson = (name: string, options: Record<string, unknown> = {}): Field => ({
  name,
  type: 'json',
  ...options,
})

export const configEpoch = (name: string, options: Record<string, unknown> = {}): Field => ({
  name,
  type: 'number',
  min: 0,
  ...options,
})
