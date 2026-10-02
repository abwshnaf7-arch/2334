import fs from 'fs';
import * as topo from 'topojson-client';
import {geoMercator, geoPath} from 'd3-geo';
const t=JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const countries=topo.feature(t,t.objects.countries);
const W=4096;
const lon0=-24,lon1=94,lat0=0,lat1=66;
const rad=Math.PI/180, my=l=>Math.log(Math.tan(Math.PI/4+l*rad/2));
const sc=W/((lon1-lon0)*rad), H=Math.ceil(sc*(my(lat1)-my(lat0)));
const ymid=(my(lat0)+my(lat1))/2, latc=(2*Math.atan(Math.exp(ymid))-Math.PI/2)/rad;
const proj=geoMercator().scale(sc).center([(lon0+lon1)/2,latc]).translate([W/2,H/2]);
const path=geoPath(proj);
const out={W,H,countries:[],borders:path(topo.mesh(t,t.objects.countries,(a,b)=>a!==b))};
for(const f of countries.features){
  const id=+f.id; const d=path(f); if(!d) continue;
  const b=path.bounds(f); if(b[1][0]<0||b[0][0]>W||b[1][1]<0||b[0][1]>H) continue;
  out.countries.push({id,name:f.properties.name,d});
}
const P=(lon,lat)=>proj([lon,lat]).map(v=>+v.toFixed(1));
out.pts={
 london:P(-0.1,51.5), england:P(-1.6,52.6), egypt:P(29.5,26.5), suez:P(32.55,30.0), portsaid:P(32.3,31.27), india:P(78.5,22), mumbai:P(72.8,19.0), gibraltar:P(-5.6,36.0)
};
// route waypoints [lon,lat]
const route=[[-0.1,51.5],[-1.5,50.0],[-6.5,48.2],[-10.0,43.5],[-9.6,38.5],[-6.2,36.0],[-2.0,36.1],[3.5,37.2],[10,37.6],[14.5,35.2],[19,34.3],[25,33.2],[29.5,32.2],[32.3,31.3],[32.45,30.4],[32.55,29.95],[33.2,28.4],[34.5,26.2],[36.6,22.8],[38.6,19.3],[41.2,15.5],[43.4,12.6],[46,12.2],[50,13.0],[56,15.0],[62,16.5],[68,17.6],[72.5,18.9]];
out.route=route.map(r=>P(r[0],r[1]));
out.routeLL=route;
fs.writeFileSync('data.json',JSON.stringify(out));
console.log(W,H,out.countries.length,fs.statSync('data.json').size);
