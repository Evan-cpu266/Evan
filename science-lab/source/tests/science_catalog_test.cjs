'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const lib=require('../science_gallery/catalog.js');
let checks=0;
function test(name,fn){fn();checks++;process.stdout.write('✓ '+name+'\n');}
const catalog=lib.catalog;
test('37 distinct real engine/model combinations with stable IDs',()=>{
  assert.equal(catalog.length,37);
  assert.equal(new Set(catalog.map(s=>s.id)).size,37);
  assert.equal(new Set(catalog.map(s=>s.engine+':'+s.model)).size,37);
  assert.equal(catalog.filter(s=>s.subject==='chemistry').length,23);
  assert.equal(catalog.filter(s=>s.subject==='physics').length,14);
});
test('every record has a usable lesson guide and known topic',()=>{
  for(const item of catalog){
    assert.ok(item.title.length>3);assert.ok(item.summary.length>20);assert.ok(item.formula);
    assert.equal(item.guide.length,3);assert.ok(item.guide.every(s=>typeof s==='string'&&s.length>15));
    assert.ok(lib.topics.some(t=>t.id===item.topic&&t.subject===item.subject));
    assert.ok(['ap','high-school'].includes(item.level));assert.ok(['physics','chemistry'].includes(item.engine));
  }
});
test('chemistry records map exactly to the existing 23 models',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../chemistry_lab/catalog.js'),'utf8'),context);
  assert.deepEqual(catalog.filter(s=>s.subject==='chemistry').map(s=>s.model).sort(),Array.from(context.window.ChemistryCatalog,s=>s.model).sort());
});
test('existing physics uses eight different engines rather than duplicated lesson cards',()=>{
  assert.deepEqual(catalog.filter(s=>s.engine==='physics').map(s=>s.model).sort(),['forces','friction','work','energy','power','momentum','impulse','collision'].sort());
  assert.equal(catalog.filter(s=>s.model.startsWith('physics-')).length,6);
});
test('every catalog entry resolves to an actual implemented calculation and drawing engine',()=>{
  const descriptors=Object.assign({},require('../chemistry_lab/structure.js'),require('../chemistry_lab/reactions.js'),require('../chemistry_lab/equilibrium.js'),require('../science_gallery/physics-extra.js'));
  const physics=require('../orbit_course/experiments.js');
  for(const item of catalog){
    if(item.engine==='chemistry'){
      assert.equal(typeof descriptors[item.model]?.calculate,'function',item.id+' calculation');
      assert.equal(typeof descriptors[item.model]?.draw,'function',item.id+' diagram');
    }else assert.equal(typeof physics[item.model],'function',item.id+' physics model');
  }
});
test('default featured collection introduces both subjects',()=>{
  assert.deepEqual(new Set(lib.filter(catalog,{}).slice(0,6).map(s=>s.subject)),new Set(['physics','chemistry']));
  assert.deepEqual(lib.filter(catalog,{}),catalog);
});
test('subject and topic filters combine and topic choices act as alternatives',()=>{
  assert.equal(lib.filter(catalog,{subject:'chemistry'}).length,23);
  assert.equal(lib.filter(catalog,{subject:'physics'}).length,14);
  const filtered=lib.filter(catalog,{subject:'physics',topics:['energy','momentum']});
  assert.equal(filtered.length,6);assert.ok(filtered.every(s=>['energy','momentum'].includes(s.topic)));
  assert.equal(lib.filter(catalog,{subject:'chemistry',topics:['waves']}).length,0);
});
test('AP and high-school level filters reflect actual catalog metadata',()=>{
  const ap=lib.filter(catalog,{levels:['ap']});assert.equal(ap.length,11);assert.ok(ap.every(s=>s.subject==='chemistry'));
  assert.equal(lib.filter(catalog,{levels:['ap','high-school']}).length,37);
  assert.equal(lib.filter(catalog,{subject:'physics',levels:['ap']}).length,0);
});
test('search accepts plain text and matches descriptions, formulas and subject',()=>{
  assert.equal(lib.filter(catalog,{search:'  VECTOR  '})[0].id,'physics-vectors');
  assert.ok(lib.filter(catalog,{search:'PV = nRT'}).some(s=>s.model==='gas'));
  assert.equal(lib.filter(catalog,{search:'physics'}).length,14);
  assert.ok(lib.filter(catalog,{search:'pH'}).every(s=>s.subject==='chemistry')); // "pH" must not match every physics card through the subject label.
  assert.equal(lib.filter(catalog,{search:'<img onerror=alert(1)>'}).length,0);
  assert.equal(lib.filter(catalog,{search:'['}).length,4); // Formula notation is literal text, never a regular expression.
});
test('saved-only requires real saved IDs and works with a Set',()=>{
  assert.equal(lib.filter(catalog,{savedOnly:true}).length,0);
  assert.deepEqual(lib.filter(catalog,{savedOnly:true,savedIds:['chem-gas','unknown-id']}).map(s=>s.id),['chem-gas']);
  assert.deepEqual(lib.filter(catalog,{savedOnly:true,savedIds:new Set(['phys-forces'])}).map(s=>s.id),['phys-forces']);
});
test('sort changes result order without mutating the catalog',()=>{
  const before=catalog.map(s=>s.id);const asc=lib.filter(catalog,{sort:'az'}),desc=lib.filter(catalog,{sort:'za'});
  assert.deepEqual(desc.map(s=>s.id),asc.map(s=>s.id).reverse());
  assert.deepEqual(catalog.map(s=>s.id),before);
});
test('records, guides, topic metadata and collection API are frozen',()=>{
  assert.ok(Object.isFrozen(lib)&&Object.isFrozen(catalog)&&Object.isFrozen(lib.topics));
  assert.throws(()=>{catalog[0].title='Changed';},TypeError);assert.throws(()=>{catalog[0].guide.push('Changed');},TypeError);
});
test('safe lookup and browser aliases match Node records',()=>{
  assert.equal(lib.byId('chem-gas').model,'gas');assert.equal(lib.byId('__proto__'),null);
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../chemistry_lab/catalog.js'),'utf8'),context);
  context.ChemistryCatalog=context.window.ChemistryCatalog;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../science_gallery/catalog.js'),'utf8'),context);
  assert.equal(context.ScienceLibrary.catalog,context.ScienceCatalog);assert.equal(context.ScienceTopics,context.ScienceLibrary.topics);
  assert.deepEqual(Array.from(context.ScienceCatalog,s=>s.id),catalog.map(s=>s.id));
});
test('all 37 original thumbnails contain safe, distinct finite SVG diagrams',()=>{
  class Element{
    constructor(tag){this.tagName=tag;this.attributes={};this.children=[];this.textContent='';}
    setAttribute(key,value){this.attributes[key]=String(value);}
    append(...children){this.children.push(...children);}
  }
  const context={document:{createElementNS:(_ns,tag)=>new Element(tag)}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../science_gallery/art.js'),'utf8'),context);
  const drawings=[];
  for(const item of catalog){
    const svg=context.ScienceArt.thumbnail(item);assert.equal(svg.tagName,'svg');assert.equal(svg.attributes.viewBox,'0 0 480 260');
    assert.equal(svg.attributes['aria-hidden'],'true');
    let diagramNodes=0;
    function walk(element){
      assert.ok(!['script','image','foreignObject','a'].includes(element.tagName));
      if(element.tagName!=='svg')diagramNodes++;
      for(const[key,value]of Object.entries(element.attributes)){
        assert.ok(!/^on/i.test(key));assert.ok(!/\b(?:NaN|Infinity)\b/.test(value),item.id+':'+key);
        if(['width','height','r','rx','ry'].includes(key))assert.ok(Number(value)>=0,item.id+':'+key);
      }
      element.children.forEach(walk);
    }
    walk(svg);assert.ok(diagramNodes>30);drawings.push(JSON.stringify(svg));
  }
  assert.equal(new Set(drawings).size,37);
});
console.log(checks+' Orbit Science catalog checks passed.');
