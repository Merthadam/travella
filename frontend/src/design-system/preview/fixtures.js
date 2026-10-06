import { ids } from '../schemas';
const base = {
  essentials: { status:'ready', dates:{start:'',end:'',note:'A week in September',flexible:true},travelers:2,budget:{label:'€1,500 total',noFixedBudget:false} },
  map: {status:'ready',destination:'Lisbon, Portugal',final:true,pins:[
    {id:'stay-1',name:'A quiet little stay',category:'stay',position:{lat:38.715,lng:-9.14},description:'Somewhere comfortable to return to. Sample accommodation pin.'},
    {id:'airport-1',name:'Arrival airport',category:'airport',position:{lat:38.774,lng:-9.135},description:'The starting point for this sample trip.'},
    {id:'food-1',name:'Morning coffee',category:'food',position:{lat:38.712,lng:-9.143},description:'A slow start, a good coffee, nowhere to rush. Sample café.'},
    {id:'activity-1',name:'Sunset viewpoint',category:'activity',position:{lat:38.718,lng:-9.134},description:'Leave an evening open for the view. Sample attraction.'},
  ]},
  themes:{status:'ready',items:[{id:'t1',kind:'theme',text:'Food & cafés',source:'Conversation'},{id:'t2',kind:'theme',text:'Coastal walks',source:'You'},{id:'t3',kind:'theme',text:'Architecture',source:'You'},{id:'t4',kind:'pace',text:'Room to wander',source:'From your conversation'},{id:'t5',kind:'priority',text:'A walkable base. Quieter evenings.',source:'Added by you'}]},
  flights:{status:'ready',need:'needed',title:'Budapest → Lisbon',subtitle:'Return flights · 2 travelers',detail:'Flexible dates in September',availability:'preview'},
  accommodation:{status:'ready',need:'needed',title:'A base with a little character',subtitle:'Lisbon · 2 travelers',detail:'Somewhere walkable, somewhere quiet',availability:'preview'},
  findings:{status:'ready',items:[{id:'f1',title:'Find the neighborhood that feels like you',summary:'This is an example of a useful, compact research finding. The finished experience would explain the trade-offs between neighborhoods and keep supporting evidence a click away.',certainty:'supported',sources:[{title:'Example visitor guide',url:'https://www.visitlisboa.com/'}],researchedAt:'Sample date'},{id:'f2',title:'Leave a little room for the coast',summary:'A sample suggestion with uncertainty clearly visible. Opening hours, journeys and conditions would need current research before being presented as verified advice.',certainty:'uncertain',sources:[]},{id:'f3',title:'A practical detail to double-check',summary:'When sources disagree, show what each says and what is still uncertain. These are design samples, not current travel facts.',certainty:'conflicting',sources:[{title:'Example source A',url:'https://www.visitlisboa.com/'},{title:'Example source B',url:'https://www.visitportugal.com/'}]}]},
  links:{status:'ready',items:[{id:'l1',title:'Lisbon, from the locals',url:'https://www.visitlisboa.com/',purpose:'Visitor information, neighborhoods and things worth exploring.',category:'official'},{id:'l2',title:'Getting around the city',url:'https://www.metrolisboa.pt/',purpose:'A place to check the metro network and practical details.',category:'transport'}]},
};
export function fixtures(state='ready') {
  const data = structuredClone(base);
  if (['empty','loading','error'].includes(state)) for (const id of ids) data[id].status=state;
  if(state==='long') { data.themes.items[0].text='Independent bookshops, tiny neighborhood cafés and long unplanned afternoons'; data.map.pins[0].name='A particularly lovely little place with a very long name';data.links.items[0].title='A comprehensive visitor guide for finding your own rhythm in the city';data.links.items[0].url='https://www.visitlisboa.com/en/a-long-example-path-for-inspecting-wrapping-and-readable-website-details'; }
  if(state==='partial'){data.essentials.travelers=null;data.essentials.budget.label='';data.map.final=false;data.map.pins=[];data.themes.items=[];data.flights.need='undecided';data.accommodation.need='not-needed';data.findings.items=[];data.links.items=[];}
  if(state==='many') data.map.pins=Array.from({length:12},(_,i)=>({...base.map.pins[i%4],id:`many-${i}`,name:`Sample place ${i+1}`}));
  return data;
}
