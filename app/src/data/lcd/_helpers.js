// Small helpers shared by the category definitions.
export const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
export const has = (arr, id) => Array.isArray(arr) && arr.includes(id);
export const yes = (v) => (v === 'yes' ? true : v === 'no' ? false : null);
export const labelOf = (options, id) => { const o = options.find(([k]) => k === id); return o ? o[1] : id; };
export const listOf = (options, ids) => (ids || []).map((id) => labelOf(options, id).toLowerCase());
export const joinAnd = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
};
