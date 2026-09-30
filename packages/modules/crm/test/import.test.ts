import { describe, expect, it } from 'vitest'
import { importRecords } from '../src/commands/import'
import { parseCsv } from '../src/domain/csv'
import { makeDeps, MemoryCrm } from './memory-crm'

describe('parseCsv', () => {
  it('reads quoted cells, doubled quotes, CRLF and a byte order mark', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })

  it('rejects a quoted cell that never closes instead of dropping the rest', () => {
    expect(() => parseCsv('a,"open')).toThrow()
  })
})

const contacts = (repo: MemoryCrm) => [...repo.records.contact.values()]
const organizations = (repo: MemoryCrm) => [...repo.records.organization.values()]

describe('importRecords', () => {
  it('creates contacts, links or creates their organization, and skips a repeated email', async () => {
    const repo = new MemoryCrm()
    const csv =
      'firstName,email,organization\nAda,ada@example.test,Acme\nAda Again,ADA@example.test,Acme\nBo,bo@example.test,\n'
    const result = await importRecords(makeDeps(repo, 'manager'), { type: 'contact', csv })
    expect(result.ok && [result.value.created, result.value.skipped, result.value.organizationsCreated]).toEqual([
      2, 1, 1,
    ])
    expect(contacts(repo).map((contact) => contact.firstName)).toEqual(['Ada', 'Bo'])
    expect(organizations(repo).map((organization) => organization.name)).toEqual(['Acme'])
  })

  it('creates nothing in a dry run but reports the same counts', async () => {
    const repo = new MemoryCrm()
    const csv = 'name\nAcme\nGlobex\nacme\n'
    const result = await importRecords(makeDeps(repo, 'owner'), { type: 'organization', csv, dryRun: true })
    expect(result.ok && [result.value.created, result.value.skipped]).toEqual([2, 1])
    expect(organizations(repo)).toHaveLength(0)
  })

  it('reports a bad row with its number and imports the rest', async () => {
    const repo = new MemoryCrm()
    const csv = 'firstName,email\nAda,ada@example.test\nBo,not-an-email\n'
    const result = await importRecords(makeDeps(repo, 'manager'), { type: 'contact', csv })
    expect(result.ok && result.value.created).toBe(1)
    expect(result.ok && result.value.errors.map((error) => error.row)).toEqual([2])
  })

  // Importing writes many records, so staff must not be able to.
  it('refuses staff', async () => {
    const repo = new MemoryCrm()
    const result = await importRecords(makeDeps(repo, 'staff'), { type: 'organization', csv: 'name\nAcme\n' })
    expect(result.ok ? undefined : result.error.code).toBe('FORBIDDEN')
    expect(organizations(repo)).toHaveLength(0)
  })
})
