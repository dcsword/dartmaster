export const RULESETS = [
  { value: 'double_out', label: 'Double Out', desc: 'Must finish on a double' },
  { value: 'straight_out', label: 'Straight Out', desc: 'Any dart to finish' },
  { value: 'triple_out', label: 'Triple Out', desc: 'Must finish on a triple' },
];

export const COLORS = ['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#40c0b0'];

export const PRESETS = [
  { label: 'Casual', format: 'first_to', legs: 1, sets: 1 },
  { label: 'FT3 legs', format: 'first_to', legs: 3, sets: 1 },
  { label: 'FT5 legs', format: 'first_to', legs: 5, sets: 1 },
  { label: '3 sets', format: 'first_to', legs: 3, sets: 3 },
  { label: 'Custom', format: null, legs: null, sets: null },
];
