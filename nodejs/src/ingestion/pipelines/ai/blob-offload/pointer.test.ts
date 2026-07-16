import { encodeBlobPointer, isBlobPointer, parseBlobPointer } from './pointer'

const HASH = 'a'.repeat(64)

describe('blob pointer', () => {
    it('round-trips encode -> parse', () => {
        const uri = encodeBlobPointer({ algo: 'sha256', hash: HASH, mime: 'image/png', size: 123456 })
        expect(uri).toBe(`phblob://v1/sha256/${HASH}?mime=image%2Fpng&size=123456`)
        expect(parseBlobPointer(uri)).toEqual({ algo: 'sha256', hash: HASH, mime: 'image/png', size: 123456 })
    })

    it('detects pointers by scheme', () => {
        expect(isBlobPointer(`phblob://v1/sha256/${HASH}?mime=image%2Fpng&size=1`)).toBe(true)
        expect(isBlobPointer('data:image/png;base64,AAAA')).toBe(false)
    })

    it.each([
        ['not a pointer', 'https://example.com/img.png'],
        ['unknown version', `phblob://v9/sha256/${HASH}?mime=image%2Fpng&size=1`],
        ['unknown algo', `phblob://v1/md5/${HASH}?mime=image%2Fpng&size=1`],
        ['bad hash length', 'phblob://v1/sha256/abc123?mime=image%2Fpng&size=1'],
        ['non-hex hash', `phblob://v1/sha256/${'z'.repeat(64)}?mime=image%2Fpng&size=1`],
        ['missing mime', `phblob://v1/sha256/${HASH}?size=1`],
        ['missing size', `phblob://v1/sha256/${HASH}?mime=image%2Fpng`],
        ['non-integer size', `phblob://v1/sha256/${HASH}?mime=image%2Fpng&size=1.5`],
        ['unparseable', 'phblob://'],
    ])('parse returns null for %s', (_name, value) => {
        expect(parseBlobPointer(value)).toBeNull()
    })
})
