'use strict';

const fs = require('fs');
const hashmap = require('hashmap');
const cheerio = require("cheerio");
const pp = require('puppeteer-core');

const sites = [
  'akamai-technologies',
  'appgate-security',
  'attivo-networks-inc-',
  'axis-security',
  'banyansecurity',
  'cyolo',
  'infused-innovations-inc',
  'instasafe',
  'logrocket',
  'mandiant',
  'netmotion-software',
  'netskope',
  'perimeter-81',
  'twingate',
  
  'vectra_ai',
  'hashicorp',
  'lookout',
  'illumio',
];

var corp = process.argv[2] || 'crowdstrike';
corp = corp.toLowerCase();

const brsw = process.argv[3] || '1';
if(corp.length < 4) process.exit(1);

const USERNM_SELECTOR = '#username';
const PASSWD_SELECTOR = '#password';
const BUTTON_SELECTOR = '.btn__primary--large.from__button--floating';

const EDGE_MS_BROWSER = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROMEG_BROWSER = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const LINKEDIN = 'kxj99@qq.com';
const PASSW0RD = 'Dev00p@123';

var tbrowser = brsw == 1 ? CHROMEG_BROWSER : EDGE_MS_BROWSER;

var linlogin = 'https://www.linkedin.com/login?trk=guest_homepage-basic_nav-header-signin';

var arctoot = process.env.ARCROOT;
if (! arctoot) {
    console.log('warning: export ARCROOT first, use ../arcroot as default');
    arctoot = '../arcroot';
}
var cpinfo = arctoot + '/corps/';

var stime = process.hrtime(), stopt;

async function get_corp_info(corps){   
    let corp0 = corps[0];
    let corpabout = `https://www.linkedin.com/company/${corp0}/about/`;

    const browser = await pp.launch({
        headless: false,
        executablePath: tbrowser,
        userDataDir: arctoot + '/corps/temp'
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });

    await page.goto(linlogin, {waitUntil: 'load', timeout: 0});

    let needlogin = await page.evaluate(() => {
      let el = document.querySelector('#username')
      return el ? true : false
    })

    if(needlogin){
        await page.click(USERNM_SELECTOR);
        await page.keyboard.type(LINKEDIN);

        await page.click(PASSWD_SELECTOR);
        await page.keyboard.type(PASSW0RD);

        await page.click(BUTTON_SELECTOR);
    }
    stopt = process.hrtime(stime);
    console.log("%s %s %s", "BS", 'ready'.padEnd(24), `${(stopt[0] * 1e9 + stopt[1])/1e9}s`);

    for (let i=0; i < corps.length; i++) {
        corp0 = corps[i];
        corpabout = `https://www.linkedin.com/company/${corp0}/about/`;
        let jobscount = `https://www.linkedin.com/company/${corp0}/jobs/`;

        await page.goto(corpabout, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector('.overflow-hidden', {timeout: 3000});

        let html = await page.content();
        await page.screenshot({path: cpinfo + `${corp0}.png`, fullPage: true});

        let fhtml = cpinfo + `${corp0}.html`;
        let jctxt = cpinfo + `${corp0}_jc.txt`;
        fs.writeFileSync(fhtml, html, function (err) {if (err) throw err;});

        // jobs count
        await page.goto(jobscount, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector('.org-jobs-container', {timeout: 3000});
        html  = await page.content();
        let $ = cheerio.load(html);
        let jj = $('.org-jobs-job-search-form-module__headline'), cc;
        if( jj.length == 0) cc = '0'
        else{
            cc = $(jj).text().match(/.* has (.+) job/)[1];
        }
        fs.writeFileSync(jctxt, cc, function (err) {if (err) throw err;});

        let ff = fs.statSync( fhtml ).size;
        let rs = ff > 50 ? 'OK' : 'NG'; // > 50kb

        stopt = process.hrtime(stime);
        console.log("%s %s %s jobs %s", rs, corp0.padEnd(24), `${(stopt[0] * 1e9 + stopt[1])/1e9}s`.padEnd(13), cc);
    }

    await browser.close();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function corp_index(){
    let tt = [];
    
    tt[0] = `<!DOCTYPE html>
<html lang="en-US"><head><meta charset="utf-8">
<meta name="JK" content="Corp Info Summary" />
<title>blog index</title>
<style>
.styled-table {
    border-collapse: collapse;
    margin: auto;
    font-size: 0.9em;
    font-family: Segoe UI,Arial,sans-serif;
    min-width: 400px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    border-radius: 5px 5px 0 0;
    overflow: hidden;
}
.styled-table caption {
    margin-top: 1em;
    margin-bottom: 1em;
    font-size: 2em;
    font-weight: bold;
    text-align: center;
    color: #327A81;
}
.styled-table thead tr {
    background-color: #91CED4;
    color: #ffffff;
    text-align: left;
    font-size: 1.1em;
    text-decoration:none;
}
.styled-table th,
.styled-table td {
    padding: 12px 15px;
}
.styled-table tbody tr {
    border-bottom: 1px solid #dddddd;
}
.styled-table tbody tr:nth-of-type(even) {
    background-color: #f3f3f3;
}
.styled-table tbody tr:last-of-type {
    border-bottom: 2px solid #91CED4;
}
.styled-table tbody tr.active-row {
    font-weight: bold;
    color: #91CED4;
}
a { text-decoration: none; color: #000}
a:hover { color: Orange ; }
.btn {
    text-align: center;
    vertical-align: middle;
    border: 1px solid transparent;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    text-decoration:none;
    color: #fff;
    background-color: #67D5AC;
    border-color: #67D5AC; }
    .btn-success:hover {
        color: #fff;
        background-color: #91CED4;
        border-color: #25BCAA; }
}
</style></head><body>

<table class="styled-table">
<caption>Corp Info Summary</caption>
<thead>
<tr >
<th style="border-radius: 5px 0 0 0;">seq</th>
<th >Company</th>
<th >Industry</th>
<th >Size</th>
<th >Headquarter</th>
<th >Founded</th>
<th >Job Openings</th>
<th style="border-radius: 0 5px 0 0;">Link</th>
</tr></thead>
<tbody>
`;
    
    let createtime = new Date().toISOString();
    
    // create svg and add to <a> https://seanyeh.com/pages/creating_svgs_in_javascript/
    tt[1] = `</tbody></table>
<script type="text/javascript">
    var extlk = document.getElementsByClassName('extlk');
    for (var i=0; i < extlk.length; i++) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "octicon octicon-star");
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("fill", "#67D5AC");

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.854 8.803a.5.5 0 1 1-.708-.707L9.243 6H6.475a.5.5 0 1 1 0-1h3.975a.5.5 0 0 1 .5.5v3.975a.5.5 0 1 1-1 0V6.707l-4.096 4.096z");
        svg.appendChild(path);
        
        extlk[i].textContent ='';
        extlk[i].appendChild(svg);
    }    
</script>

<br/><div style="text-align: right;">${createtime}</div>

</body></html>`;

    return tt;
}

function gen_report(){
    console.log('process report');

    let cphash = new hashmap();
    for (let i=0; i < sites.length; i++) {
        let hh = cpinfo + sites[i] + '.html';
        if (! fs.existsSync(hh)) continue;
        
        let jf = cpinfo + sites[i] + '_jc.txt', jc = '0';
        if (fs.existsSync(jf)) jc = fs.readFileSync(jf);

        let cc = fs.readFileSync(hh);
        let $ = cheerio.load(cc)
        $(".artdeco-button__text").remove();

        let cap = $('.mb1.text-heading-small');
        let inf = $('.mb4.text-body-small.t-black--light');

        let detail = new hashmap();
        for (let j=0; j < cap.length; j++) {
            let key = $(cap[j]).text().trim();
            let val = $(inf[j]).text().trim().replace(' on LinkedIn','');

            if( key.match( /(Specialties|Phone)/ ) ) continue;
            //console.log( key.padEnd(15), "  " , val);
            detail.set(key, val);
        }
        detail.set('Jobs', String(jc).trim());
        cphash.set(sites[i], detail);
        //console.log();
    }
    fs.writeFileSync(arctoot + '/corps.hash', JSON.stringify(cphash), function (err) { if (err) throw err; });

    let tblrow = '', i=1;
    cphash.forEach(function(val, key) {
        console.log("   ..." + key);

        let indt = val.has('Industry')     ? val.get('Industry')     : 'in';
        let size = val.has('Company size') ? val.get('Company size') : '01';
        let hdqt = val.has('Headquarters') ? val.get('Headquarters') : 'hq';
        let year = val.has('Founded')      ? val.get('Founded')      : '00';
        let jobs = val.has('Jobs')         ? val.get('Jobs')         : '00';
        let jobl = `https://www.linkedin.com/company/${key}/jobs/`;
        let name = key.replace(/-/g, ' ').replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

        tblrow += `
<tr >
<td >${i}</td>
<td ><a href="${val.get('Website')}" target="_blank">${name}</a></td>
<td >${indt}</td>
<td >${size}</td>
<td >${hdqt}</td>
<td >${year}</td>
<td >${jobs}</td>
<td ><a href="${jobl}" target="_blank" class="extlk"></a></td>
</tr>`;
        i++;
    });

    //  create index.html
    let ii = arctoot + '/corps.html';
    let tt = corp_index();
    fs.writeFileSync(ii, tt[0] + tblrow + tt[1], function (err) { if (err) console.error(err); });

    stopt = process.hrtime(stime);
    console.log("%s %s %s", 'SU', 'corp report'.padEnd(24), `${(stopt[0] * 1e9 + stopt[1])/1e9}s`);
}

// --- start ---

(async () => {
    if( process.argv.length > 2 ){
        console.log('process ' + process.argv[2]);
        process.argv[2].match(/getinfo/i) ? 
            await get_corp_info(sites) :    // all corp
            await get_corp_info( [corp] );  // corp in cmdl

        gen_report();
    }else{
        gen_report();
    }
})().catch(e => {
    // Deal with the fact the chain failed
});
