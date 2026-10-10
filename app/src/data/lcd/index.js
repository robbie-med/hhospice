import general from './general.js';
import cancer from './cancer.js';
import als from './als.js';
import dementia from './dementia.js';
import heart from './heart.js';
import hiv from './hiv.js';
import liver from './liver.js';
import pulmonary from './pulmonary.js';
import renal from './renal.js';
import stroke from './stroke.js';

export { GENERAL_FIELDS } from './general.js';
export const CATEGORIES = [cancer, heart, pulmonary, dementia, stroke, als, liver, renal, hiv, general];
export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || general;
