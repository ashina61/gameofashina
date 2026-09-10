/**
 * Mimari kurallari koda baglar.
 * Bu testler kirilirsa katman ayrimi bozulmustur.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Verilen klasordeki tum .ts dosyalarini toplar. */
function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('katman kurallari', () => {
  it('core/, systems/, utils/ ve types/ Phaser import etmez', () => {
    const files = ['src/core', 'src/systems', 'src/utils', 'src/types'].flatMap((d) => collect(d));
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((f) => /from ['"]phaser['"]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('core/ ve systems/ sahne veya arayuz katmanina bagimli degildir', () => {
    const files = ['src/core', 'src/systems'].flatMap((d) => collect(d));
    const offenders = files.filter((f) =>
      /from ['"]@\/(scenes|ui|render|input)\//.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
