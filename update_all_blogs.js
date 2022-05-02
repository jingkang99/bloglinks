'use strict';

const CALC = true;

const fs = require('fs');
const { readdir, stat } = require('fs/promises');

const path    = require('path');
const async   = require('async');
const axios   = require("axios");
const colors  = require("colors");
const hashmap = require('hashmap');
const cheerio = require("cheerio");
const execcmd = require('child_process').execFileSync;

const argv = process.execArgv.join();
const isDebug = argv.includes('inspect');
const isVerbs = argv.includes('verbose');
var   arctoot = process.env.ARCROOT;

const urlroot = 'https://www.Tech Blog Repo/blogs/';
const ua_chrm = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36';

if (! arctoot) {
    console.log('warning: export ARCROOT first, use ../arcroot as default');
    arctoot = '../arcroot';
}

let www = urlroot.match(/http[s]:\/\/(.+?)\//); 
let bserver = www[1].replace("www\.", '');
let prjroot = arctoot + '/' + bserver;
let pagroot = arctoot + '/' + bserver + '/page';
let datroot = arctoot + '/' + bserver + '/data';
let blgroot = arctoot + '/' + bserver + '/blog';
let onepage = arctoot + '/' + bserver + '/' + bserver + '.html';

let blogarry = prjroot + '/blogs.array';
let bloghash = prjroot + '/blogs.hash' ;
let blgindex = prjroot + '/index.html' ;

const config = {
    headers: { 'User-Agent': ua_chrm }, 
}

async function axios_get(url){
    let html;
    let resp = await axios.get(url, config)
    .catch(function (error) {
        if (error.response) {
            // Request made and server responded
            console.log(error.response.status);
            //console.log(error.response.data);
            //console.log(error.response.headers);
            process.exit(1);
        } else if (error.request) {
            // The request was made but no response was received
            //console.log(error.message);
            process.stdout.write(`@`);
            let tmpf = 'axios.tmp';
            try {
                fs.unlinkSync(tmpf);
            } catch(err) {
            }

            execcmd('curl', ['--user-agent', ua_chrm, '-s', '-o', tmpf, url], {stdio:'inherit'});
            html = fs.readFileSync(tmpf).toString();
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('error', error.message);
        }
    });
    return html != null ? html : resp.data;
}

function blog_index(){
    let tt = [];
    
    tt[0] = `<!DOCTYPE html>
<html lang="en-US"><head><meta charset="utf-8">
<meta name="JK" content="SZ Threat Intel" />
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
<caption>${bserver}</caption>
<thead>
<tr >
<th style="border-radius: 5px 0 0 0;">seq</th>
<th >count</th>
<th >blog size</th>
<th >image size</th>
<th >Corporate</th>
<th >Category</th>
<th style="border-radius: 0 5px 0 0;">Link</th>
</tr></thead>
<tbody>
`;
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
</script></body></html>`;

    return tt;
}

function getSize(path){
    if(! CALC) return 0;  //calc space usage

    let size = 0;
    if(fs.statSync(path).isDirectory()){
        const files = fs.readdirSync(path);
        files.forEach(file => {
            size += getSize(path + "/" + file);
        });
    }
    else{
        size += fs.statSync(path).size;
    }
    return size;
}

function convertBytes(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    if (bytes == 0) return "n/a";

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    if (i == 0) return bytes + " " + sizes[i];

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i];
}

async function corp_info(name) {
    let u = `https://www.linkedin.com/company/${name}/about/`;
    console.log(u);

    let r = await axios_get(u);
    var $ = cheerio.load(r);
    console.log("get : %s bytes", r.length);

    let i = $('.overflow-hidden dd');
    console.log("info: %s bytes", i.length);
}

// --- start ---
var confgjson = 'config.json';
var blogsites;
if ( fs.existsSync(confgjson) ){
    let buffe = fs.readFileSync(confgjson).toString();
    blogsites = JSON.parse(buffe);
}else{
    console.log("  error: missing " + confgjson);
}

let jslist = fs.readdirSync('.');
let fdlist = fs.readdirSync(arctoot);
let sthash = new hashmap();
let tblrow = '';

let j=1, corps = [];
for(var key in blogsites){
    console.log("  " + key.cyan);  // category
    for(let i=0; i < blogsites[key].length; i++){
        let ss = Object.keys(blogsites[key][i]); // 
        let st = ss[0]; // site name
        
        if(ss[1] != null) corps.push( blogsites[key][i][ ss[1] ] );

        if ( blogsites[key][i][st].match('no') ) continue;

        let obj = JSON.parse('{"cmdjs" : "", "foldr" : "", "class" : ""}');
        jslist.forEach( e => {
            if(e.match(st)) obj.cmdjs = e;
        });

        fdlist.forEach( e => {
            if(e.match(st)) obj.foldr = e;
        });
        obj.class = st;

        console.log("    %s %s %s", st.padEnd(20).grey, obj.cmdjs.padEnd(37).gray, obj.foldr.yellow);
        sthash.set(st, key);

        let bloglink = arctoot + '/' + obj.foldr + '/' + 'index.html';
        let sitelink = 'https://' + obj.foldr;
        let blgcount = fs.readdirSync(arctoot + '/' + obj.foldr + '/blog').length;

        let sizeblog = getSize(arctoot + '/' + obj.foldr + '/blog');
        let sizedata = getSize(arctoot + '/' + obj.foldr + '/data');
        
        sizeblog = convertBytes(sizeblog);
        sizedata = convertBytes(sizedata);

    tblrow += `
<tr >
<td >${j}</td>
<td >${blgcount}</td>
<td >${sizeblog}</td>
<td >${sizedata}</td>
<td ><a href="${bloglink}">${obj.foldr}</a></td>
<td ></td>
<td ><a href="${sitelink}" target="_blank" class="extlk"></a></td>
</tr>`;
        //execcmd('node', [cmdjs, '--check-new'], {stdio:'inherit'});
        //execcmd('node', [cmdjs, '--save-blog'], {stdio:'inherit'});
        j++;
    }
}

//  create index.html
let ii = arctoot + '/index.html';
let tt = blog_index();
fs.writeFileSync(ii, tt[0] + tblrow + tt[1], function (err) { if (err) console.error(err); });

corps = corps.sort();
console.log(corps);

process.exit();

const arg = process.argv.slice(2);

switch (arg[0]) {
    case '--save-urls':
        console.log('== save-urls ==');
        get_all_blog_url2array(urlroot, false, 30);
        break;
    case '--check-new':
        console.log('== check-new ==');
        CHCKNEW = true;
        get_all_blog_url2array(urlroot, false, 1);
        break;
    case '--save-blog':
        console.log('== save-blog ==');
        if(arg[1] > 0){
            console.log("process first " + arg[1] + " blogs");
            process_blog_cont2file(arg[1]);
        }else{
            if(arg.length ==2 && arg[1].match(/[a-zA-Z]/)) break;

            console.log("process all blogs");
            process_blog_cont2file();
        }
        break;
    case '--help':
    default:
        let ndjs = path.basename(__filename);
        console.log(`\nUsage:
node --inspect ${ndjs} --save-urls
node --inspect ${ndjs} --save-blog NUM
node --inspect ${ndjs} --check-new`);

}