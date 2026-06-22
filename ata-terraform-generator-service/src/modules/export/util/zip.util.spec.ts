import { inflateRawSync } from 'zlib';
import { buildZip } from './zip.util';

/** Reads back a zip produced by buildZip by walking local file headers. */
function readZip(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  let pos = 0;
  while (pos + 4 <= buf.length && buf.readUInt32LE(pos) === 0x04034b50) {
    const compSize = buf.readUInt32LE(pos + 18);
    const nameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const name = buf.slice(pos + 30, pos + 30 + nameLen).toString('utf-8');
    const dataStart = pos + 30 + nameLen + extraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    out[name] = inflateRawSync(data).toString('utf-8');
    pos = dataStart + compSize;
  }
  return out;
}

describe('buildZip', () => {
  it('round-trips file contents and paths', () => {
    const zip = buildZip([
      { path: 'main.tf', content: 'resource "aws_s3_bucket" "b" {}' },
      { path: 'modules/vpc/main.tf', content: 'variable "cidr" {}' },
    ]);
    const files = readZip(zip);
    expect(files['main.tf']).toBe('resource "aws_s3_bucket" "b" {}');
    expect(files['modules/vpc/main.tf']).toBe('variable "cidr" {}');
  });

  it('ends with a valid end-of-central-directory record', () => {
    const zip = buildZip([{ path: 'a.txt', content: 'hello' }]);
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(1); // total entries
  });

  it('is deterministic for identical input', () => {
    const a = buildZip([{ path: 'x', content: 'same' }]);
    const b = buildZip([{ path: 'x', content: 'same' }]);
    expect(a.equals(b)).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(() => buildZip([{ path: '../escape.tf', content: 'x' }])).toThrow();
  });
});
