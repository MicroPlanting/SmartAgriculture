import assert from "node:assert/strict";
import { evaluate, GAS_THRESHOLD, TEMPERATURE_THRESHOLD } from "./thresholds.js";
const cases = [
 [{gas:999},{gas:false}],[{gas:1000},{gas:false}],[{gas:1001},{gas:true}],
 [{temperature:34},{temp:false}],[{temperature:35},{temp:false}],[{temperature:36},{temp:true}],
 [{temperature:36,gas:1001},{temp:true,gas:true,active:true}],[{temperature:30,gas:1001},{temp:false,gas:true,active:true}],
 [{temperature:36,gas:400},{temp:true,gas:false,active:true}],[{temperature:30,gas:400},{temp:false,gas:false,active:false}],
 [{gas:undefined,temperature:30},{gas:false,gasUnavailable:true,active:false}],[{gas:null,temperature:30},{gas:false,gasUnavailable:true}],
 [{temperature:undefined,gas:400},{temp:false,tempUnavailable:true,active:false}],[{temperature:NaN,gas:Infinity},{temp:false,gas:false,active:false}],
 [{temperature:"hot",gas:"2000"},{temp:false,gas:false}],
];
let n=0;for(const[i,e]of cases){const r=evaluate(i);for(const k in e)assert.equal(r[k],e[k],JSON.stringify(i)+" "+k);n++}
assert.equal(GAS_THRESHOLD,1000);assert.equal(TEMPERATURE_THRESHOLD,35);
assert.equal(evaluate({soil_raw:4000,temperature:20,gas:100}).active,false); // dry soil alone is no emergency
console.log(n+1,"checks passed");
