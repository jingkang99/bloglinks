'use strict';

const fs = require('fs');
const pp = require('puppeteer-core');

var link = process.argv[2] || 'google.com';
var brsw = process.argv[3] || '1';
if(  link.length < 7 ) process.exit(1);
if(! link.match(/^http/) ) link = 'https://' + link;

const EDGE_MS_BROWSER = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROMEG_BROWSER = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
var  tbrowser = brsw == 1 ? CHROMEG_BROWSER : EDGE_MS_BROWSER;

async function get_url_html(url){
    let stime = process.hrtime();
    var linkf = 'linkf';

    const browser = await pp.launch({
        headless: false,
        executablePath: tbrowser,
        userDataDir: "./temp"
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });

    await page.goto(url, {waitUntil: 'load', timeout: 0});

    await page.screenshot({path: `${linkf}.png`, fullPage: true});

    const html = await page.content();
   
    let fhtml = `${linkf}.html`;
    await fs.writeFile(fhtml, html, function (err) {if (err) throw err;});

    await browser.close();
    
    let fsize = fs.statSync( fhtml ).size;
    let stopt = process.hrtime(stime);
    if( fsize > 50) // 50k
        console.log("OK " + `${(stopt[0] * 1e9 + stopt[1])/1e9}s`);
    else
        console.log("Wanin: file size " + fsize);
}

//  specified url in cmdl
if( process.argv.length > 2 ){
    get_url_html(link);
}
