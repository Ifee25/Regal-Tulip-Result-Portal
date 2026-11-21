const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const vm=require('node:vm');const fs=require('node:fs');const moduleValue={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/pupilSelection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports});
const {findSelectedPupil}=moduleValue.exports;
const pupils=[{id:'1',name:'Ada Okafor',reg_no:'REG001'},{id:'2',name:'John Obi',reg_no:'REG002'},{id:'3',name:'John Obi',reg_no:'REG003'}];
test('full name fills Reg No despite name order, spacing, and case',()=>{assert.equal(findSelectedPupil(pupils,' OKAFOR   ada ','')?.reg_no,'REG001');});
test('duplicate names require an explicit pupil selection',()=>{assert.equal(findSelectedPupil(pupils,'John Obi',''),undefined);assert.equal(findSelectedPupil(pupils,'John Obi','3').reg_no,'REG003');});
test('editing name or changing class cannot retain a stale pupil',()=>{assert.equal(findSelectedPupil(pupils,'Unknown pupil','1'),undefined);assert.equal(findSelectedPupil([], 'Ada Okafor','1'),undefined);});
test('partial names do not automatically select a child',()=>{assert.equal(findSelectedPupil(pupils,'Ada',''),undefined);});
