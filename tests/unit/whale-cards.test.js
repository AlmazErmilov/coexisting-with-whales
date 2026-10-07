import {describe,it,expect} from 'vitest';
import {summarizeWhale} from '../../js/whale-cards.js';
describe('sample summaries',()=>{
 it('keeps total records distinct from filtered records and unknown years',()=>{
  const records=[{species:'a',month:1,year:2020},{species:'a',month:1,year:2022},{species:'a',month:null,year:null},{species:'b',month:2,year:1990}];
  expect(summarizeWhale('a',records,records.slice(0,1))).toEqual({total:3,visible:1,months:[2,0,0,0,0,0,0,0,0,0,0,0],firstYear:2020,lastYear:2022});
  expect(summarizeWhale('missing',records).firstYear).toBeNull();
 });
});
