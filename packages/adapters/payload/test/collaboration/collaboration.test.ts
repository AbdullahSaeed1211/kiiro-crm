import { asId } from '@ops/kernel'
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import {
  attachmentKey,
  escapeMarkdownHtml,
  fanOutMentions,
  parseMentions,
  sanitizeFileName,
  unreadCount,
  validateAttachment,
} from '../../src/collaboration'
import { scopedSearch } from '../../src/collaboration/search'

describe('comment mentions', () => {
  it('extracts unique ids and fans out only to active users other than the author', async () => {
    const insertIfAbsent = vi.fn().mockResolvedValue('created')
    const recipients = await fanOutMentions(
      {
        commentId: asId('comment-1'),
        recordType: 'lead',
        recordId: asId('lead-1'),
        authorId: asId('author'),
        mentions: parseMentions('@[Author](author) @[Sam](sam) @[Sam](sam) @[Inactive](inactive)'),
      },
      { notifications: { insertIfAbsent }, isActiveUser: (id) => Promise.resolve(id !== asId('inactive')) },
    )
    expect(recipients).toEqual([asId('sam')])
    expect(insertIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mentioned',
        dedupeKey: 'mention:comment-1:sam',
        record: { type: 'lead', id: 'lead-1' },
      }),
    )
  })
})

describe('markdown-lite and attachments', () => {
  it('escapes HTML before rendering comment markdown', () => {
    expect(escapeMarkdownHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('uses a bounded, normalized R2 object key and enforces upload scope', () => {
    expect(sanitizeFileName('Résumé / client plan.pdf')).toBe('Resume-client-plan.pdf')
    expect(
      attachmentKey({
        recordType: 'lead',
        recordId: 'lead-1',
        attachmentId: 'file-1',
        fileName: 'Résumé / client plan.pdf',
      }),
    ).toBe('attachments/lead/lead-1/file-1/Resume-client-plan.pdf')
    expect(validateAttachment({ type: 'application/pdf', size: 10 })).toBeUndefined()
    expect(validateAttachment({ type: 'application/x-msdownload', size: 10 })).toBeTypeOf('string')
    expect(validateAttachment({ type: 'application/pdf', size: 26 * 1024 * 1024 })).toBeTypeOf('string')
  })
})

describe('notification counts', () => {
  it('counts only unread rows owned by the requested user', () => {
    expect(
      unreadCount(
        [
          { id: asId('1'), userId: asId('sam'), type: 'mentioned', createdAt: 1 },
          { id: asId('2'), userId: asId('sam'), type: 'assigned', readAt: 2, createdAt: 2 },
          { id: asId('3'), userId: asId('other'), type: 'mentioned', createdAt: 3 },
        ],
        asId('sam'),
      ),
    ).toBe(1)
  })
})

describe('scoped search', () => {
  it('passes the authenticated user and Payload scope options for each type', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 'lead-1', title: 'Visible lead' }] })
    const results = await scopedSearch({ find } as unknown as Payload, {
      user: { id: 'staff-1' },
      query: 'lead',
      definitions: [{ recordType: 'lead', collection: 'leads', searchFields: ['title'], titleField: 'title' }],
    })
    expect(results).toEqual([{ recordType: 'lead', id: 'lead-1', title: 'Visible lead', subtitle: '' }])
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'leads', limit: 5, overrideAccess: false, user: { id: 'staff-1' } }),
    )
  })
})
