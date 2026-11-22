// Texte sans accents, en minuscules, apostrophes unifiées. map : position d'origine de chaque caractère.
export function fold(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = ch
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bc]/g, "'");
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
    i += ch.length;
  }
  return { folded, map };
}
export const foldText = (t: string) => fold(t).folded;
