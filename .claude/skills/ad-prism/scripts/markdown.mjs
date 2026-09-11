export function withoutFencedBlocks(text) {
  let fenceCharacter = null;
  let fenceLength = 0;

  return text
    .split(/(?<=\n)/)
    .map((line) => {
      if (fenceCharacter === null) {
        const opening = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
        if (!opening) return line;
        fenceCharacter = opening[1][0];
        fenceLength = opening[1].length;
        return line.endsWith('\n') ? '\n' : '';
      }

      const stripped = line.replace(/^[ \t]*/, '');
      const leadingSpaces = line.length - stripped.length;
      const markerLength = stripped.length - stripped.replace(new RegExp(`^\\${fenceCharacter}+`), '').length;
      const remainder = stripped.slice(markerLength).trim();
      if (leadingSpaces <= 3 && markerLength >= fenceLength && !remainder) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      return line.endsWith('\n') ? '\n' : '';
    })
    .join('');
}
