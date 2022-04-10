// export ARCROOT='../arcroot'
// node --inspect get_logrocket_blog.js

'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const axios = require("axios");
const colors = require("colors");
const crypto = require('crypto');
const hashmap = require('hashmap');
const cheerio = require("cheerio");
const execcmd = require('child_process').execFileSync;

const argv = process.execArgv.join();
const isDebug = argv.includes('inspect');
const isVerbs = argv.includes('verbose');

const urlroot = 'https://www.perimeter81.com/blog';
const REGular = ".blog-post-container";
const FEAture = ".NONO";
const blgBODY = ".entry-content";

const ua_chrm = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36';

var ONEPAGE = false;
var CHCKNEW = false;

if (! process.env.ARCROOT) {
    console.log('warning: export ARCROOT first, use ../arcroot as default');
    process.env.ARCROOT = '../arcroot';
}

// create blog data folder
let www = urlroot.match(/http[s]:\/\/(.+?)\//); 
let bserver = www[1].replace("www\.", '');
const prjroot = process.env.ARCROOT + '/' + bserver;
const pagroot = process.env.ARCROOT + '/' + bserver + '/page';
const datroot = process.env.ARCROOT + '/' + bserver + '/data';
const blgroot = process.env.ARCROOT + '/' + bserver + '/blog';
const onepage = process.env.ARCROOT + '/' + bserver + '/' + bserver + '.html';

const blogarry = prjroot + '/blogs.array';
const bloghash = prjroot + '/blogs.hash' ;
const blgindex = prjroot + '/index.html' ;

const config = {
    headers: { 'User-Agent': ua_chrm }, 
}

function parse_blog_url($, section){
    const posts = $(section);
    let blogarr = [];
    
    let ttag = 'h3';
    if(section.match(/cfUVPA/)) ttag = 'h2';

    for (let i = 0; i < posts.length; i++) {
        let postTitleWrapper = $(posts[i]).find(".title-post")[0],
            postTitle = $(postTitleWrapper).text();
            postTitle = postTitle.replace(/\n/g, '');

        let title = postTitle.replace(/ /g, '_');
        title = title.replace(/[\W]+/g, '');
        
        if(title.length < 10) continue;

        let postLinkWrapper = $(posts[i]).find("a")[0],
            postLink = $(postLinkWrapper).attr("href");
        if(! postLink.match('www') ) postLink = www[0] + postLink;

        let author = 'MK', postDate = 'January 5, 2000', postDesc=title;

        let authorWrapper = $(posts[i]).find(".author-post")[0];
        author = $(authorWrapper).text();

        postDate = $(posts[i]).find("time").text();
        if(! postDate.match(/\w+/) ) postDate = 'January 20, 2000',

        postDate = postDate.replace("th", '');
        postDate = postDate.replace("st", '');
        postDate = postDate.replace("nd", '');
        postDate = postDate.replace("rd", '');

        let postID = "post-" + crypto.createHash('md5').update(author+title, 'utf8').digest('hex').slice(0,6);
        
        let blogFile = dateFormat (new Date(postDate), "%Y-%m-%d", true);
        blogFile += '~' + postID + '~' + title;

        if(isDebug && isVerbs){
            console.log(`${postID.brightGreen}`);
            console.log(`${postTitle.yellow}`);
            console.log(`${postDate.cyan}`);
            console.log(`${author.red}`);
            console.log(`${postLink.gray}`);
            console.log("----"); 
        }

        const item_json = blog_attr(postID, postTitle, author, postLink, postDate, blogFile, postDesc);
        blogarr.push(item_json);
    }
    return blogarr;
}

async function find_blog_links(purl){
    let num = purl.match(/http[s]:\/\/.+\/(\d+)\//);
    let page = pagroot + '/p' + int3(num[1]) + '.html'; 

    let firstp = false;
    if (purl.search(/\/1\//) > 0 ){
        purl = urlroot;  // blog root page with featureed post
        firstp = true;
    }

    var html;
    if( ONEPAGE ) {
        if(CHCKNEW) {
            let resp = await axios.get(purl);
            await save_to_file(page, resp.data);
            html = resp.data;            
        }
        else{
            console.log('reading from: ' + onepage);
            html = fs.readFileSync(onepage).toString();
        }
    }else{       
        if (fs.existsSync(page) && ! firstp ){   // always read the 1st page
            html = fs.readFileSync(page).toString();
        }else{
            let resp = await axios.get(purl);
            await save_to_file(page, resp.data);
            html = resp.data;
        }
    }

    var $ = cheerio.load(html)

    // parse regular posts
    var regular_posts = parse_blog_url($, REGular);

    if (firstp){    // parse featured posts in first page        
        var feature_posts=[];
        feature_posts = parse_blog_url($, FEAture);
        regular_posts = [...feature_posts, ...regular_posts];
    }

    console.log("blog found: %d", regular_posts.length);
    return regular_posts;
}

async function save_to_file(file, content){
    try {
        if (fs.existsSync(file)) {
            return;
        }else{
            await fs.writeFile(file, content, function (err) {if (err) throw err;});
        }
    } catch(err) {
        console.error(err)
    }
}

async function save_blog_content(url, file){   
    let stime = process.hrtime();

    let resp = await axios.get(url, config);
    var $ = cheerio.load(resp.data)

    //remove product/share/links to keep layout clean
    $(".share").remove();
    $(".blog-plug").remove();
    $(".sharedaddy").remove();
    $(".hidden-lg-up").remove();
    $(".prevnextlinks").remove();

    $(".sidebar").remove();
    $(".blogNavbar").remove();
    $(".article__footer").remove();
    
    $(".related-wrapper").remove();  // p81

    let title = $("title").text().replace('- Axis Security', '-JK CTI');
    let btags = $('.aretags').find('li').text().split('#').slice(1,);
    if(btags == null) btags = '';

    let bodym = $(blgBODY).html(); // locate blog main body

    let topic = $(".title-page").text();
    if(urlroot.match('perimeter81')) bodym = `<br><h1> ${topic} </h1><br>\n` + bodym;

    if(bodym == null) bodym = $(".blog-template-grid-expand").html(); // twingate

    // to load img directly
    bodym = bodym.replaceAll(/srcset=".*?"/g, ' ');
    bodym = bodym.replaceAll(/background-image:url\(.*?\);/g, ' ');
    
    $ = cheerio.load(bodym); // only blog main part

    const bhead_s =`<!DOCTYPE html>
<html lang="en-US">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="JK" content="SZ Threat Intel" />
<title>${title}</title>

<link rel='stylesheet' id='bootstrap4-css'  href='../data/bootstrap.min.css' type='text/css' media='all' />
<link rel='stylesheet' id='mediumish-style-css'  href='../data/style.css' type='text/css' media='all' />
<link rel="stylesheet" type="text/css" id="wp-custom-css" href="../data/custom-css" />

</head>
<body class="post-template-default single single-post single-format-standard">
<div class="container">
`;
    const bhead_e ='</div></body></html>';

    var gg = $('img')   // parse all images link and save to local
    for(let i=0; i < gg.length; i++ ){       
        let imgurl = gg[i].attribs.src;
        if(! imgurl.match(/\w+/)) continue;

        let fileimage = imgurl.split('/').slice(-1)[0].split('?')[0];
        let filelocal = datroot + '/' + fileimage;  // save to

        // use local downloaded images
        bodym = bodym.replaceAll(imgurl, '../data/' + fileimage);

        if (fs.existsSync(filelocal)) continue;     // skip if already downloaded

        if(! imgurl.match(/http/)) imgurl = www[0] + imgurl;       
        const encodedurl = encodeURI(imgurl);

        try {
            const response = await axios({
                method: 'GET',
                url: encodedurl,
                responseType: 'stream',
            });
            
            const w = response.data.pipe(fs.createWriteStream(filelocal));            
            w.on('finish', () => {
                process.stdout.write(`.`);
            });
        } catch (err) { 
                console.log("  unescaped char: %s", imgurl);
                
                // url has special char that not handled by axios
                // inherit will use the stdio of the parent process
                execcmd('wget', [imgurl, '-q', '-O', filelocal], {stdio:'inherit'});

                continue;
        }
    }
    console.log("");

    // only keep the blog main body, saved space a lot 
    bodym = bhead_s + bodym + bhead_e;
    await save_to_file(file, bodym);

    let stopt = process.hrtime(stime);

    console.log("-- %s  %s  %s  %s", String(parseInt(bodym.length/1024)+'k').padEnd(7), String(gg.length+'p').padEnd(4), `${(stopt[0] * 1e9 + stopt[1])/1e9}s`, url);

    // original response data
    // await save_to_file(blgroot + '/' + file + '.resp', resp.data);

    return btags;
}

async function get_all_blog_url2array(urlp, firstpage_only=false, finalpage=0) {
    let stime = process.hrtime();

    !fs.existsSync(prjroot) && fs.mkdirSync(prjroot);
    !fs.existsSync(pagroot) && fs.mkdirSync(pagroot);
    !fs.existsSync(datroot) && fs.mkdirSync(datroot);
    !fs.existsSync(blgroot) && fs.mkdirSync(blgroot);

    var loadhtml;
    if ( fs.existsSync(onepage) ){  // onepage is saved manually
        ONEPAGE = true;
        loadhtml = fs.readFileSync(onepage).toString();
    }else{
        let resp = await axios.get(urlp, config);
        loadhtml = resp.data;
    }

    var $ = cheerio.load(loadhtml);

    var lastpage = 1;
    if( ! ONEPAGE ) {  //get max page count
        if(finalpage > 0)
            lastpage = finalpage;
        else
            lastpage = $(".bottompagination .next > a").attr("href").match(/\d+/)[0];       
        if(isDebug) console.log("\nlast page num:" + lastpage + "\n");
    }

    // load existing blog urls when checking new
    var blogs = [];
    if (fs.existsSync(blogarry) && firstpage_only){
        console.log('read existing blog array');
        let buffe = fs.readFileSync(blogarry).toString();
        blogs = JSON.parse(buffe);
    }

    let bfilelist = fs.readdirSync(blgroot).join(' ');

    // find all posts in each blog page
    for(let i = 1; i <= lastpage; i++) {
        let page = urlroot +'page/' + i + '/';
        if( ONEPAGE ) page = urlroot + '/1/';

        let pburls = await find_blog_links(page);

        if(firstpage_only){ // only check 1st page on new blog
            console.log("get %d blogs 1st page, %d", pburls.length, blogs.length);

            pburls.forEach( e => {
                let o = JSON.parse(e);
                let f = o.idblg + '~' + o.bdesc + '.html';

                //if(! fs.existsSync(f)){ 
                if(! bfilelist.match(f)){
                    console.log("  add  %s %s".green, f, o.blink);
                    blogs.unshift(e);   //add new
                }else{
                    console.log("  skip %s".grey, o.blink);
                }
            });
        }
        else{   // full from page 1 to last
            blogs = [...blogs, ...pburls];
        }
        
        // save blog array for debug
        fs.writeFile(blogarry, JSON.stringify(blogs), function (err) { if (err) throw err; });

        if(isDebug) console.log('blogs in page %d %d %s', i, blogs.length, page);

        if(firstpage_only) break;
    }
    
    let stopt = process.hrtime(stime);
    console.log(`\nblog array: ${(stopt[0] * 1e9 + stopt[1])/1e9} seconds`.yellow);
}

async function process_blog_cont2file( stopnum = 10000 ){
    let stime = process.hrtime();
    
    let buffe = fs.readFileSync(blogarry).toString();
    let blogs = JSON.parse(buffe);

    var bhmap;
    if (fs.existsSync(bloghash)){
        buffe = fs.readFileSync(bloghash).toString();
        bhmap = new hashmap(JSON.parse(buffe));
    }else{
        bhmap = new hashmap();
    }
    
    let bfilelist = fs.readdirSync(blgroot).join(' ');

    // save each individual blog
    let tablerow = '';
    for(let i = 0, j=1; i < blogs.length; i++) {
        if( i+1 > stopnum) break;

        try {
            let obj = JSON.parse(blogs[i]);
            let ofile = blgroot + '/' + obj.bfile + '.html';

            let f = obj.idblg + '~' + obj.bdesc + '.html';
            //if (fs.existsSync(ofile)){  // if processed before, get the tags
            if(bfilelist.match(f)){
                obj.btags = bhmap.get(obj.authr+' '+obj.bdesc).btags;
            }else{
                obj.btags = await save_blog_content(obj.blink, ofile);
            }

            // add a uniq id 
            obj.md5sm = crypto.createHash('md5').update(obj.authr+obj.title, 'utf8').digest('hex').slice(0,16);

            bhmap.set(obj.authr+' '+obj.bdesc, obj);

            var bltgs = '';
            if(obj.btags.length > 0)
                String(obj.btags).split(',').forEach( e => {
                    bltgs += `<a class="btn btn-success">${e}</a>&nbsp;`;
                });

            let rr;
            if(rr = bltgs.match(/(.*)(&nbsp;)/)) bltgs = rr[1];

            obj.title = obj.title.slice(0, 100);
            // create index table rows
            tablerow += `
<tr >
<td >${j}</td>
<td >${obj.datep}</td>
<td ><a href="blog/${obj.bfile}.html">${obj.title}</a></td>
<td >${bltgs}</a></td>
<td ><a href="${obj.blink}" target="_blank" class="extlk"></a></td>
</tr>`;
            j++;
            //process.stdout.write(`b`.grey);
            if( (i+1)%100 == 0 ){ console.log(); }
        } catch(err) {
            console.log(i.yellow + blogs[i]);
            console.error(err)
        }
    }

    //  create blogs.hash
    fs.writeFile(bloghash, JSON.stringify(bhmap), function (err) { if (err) throw err; });

    //  create index.html
    let tt = blog_index();
    fs.writeFile(blgindex, tt[0] + tablerow + tt[1], function (err) { if (err) throw err; });
    
    console.log("\n");
    console.log("blog count: " + blogs.length);
    let stopt = process.hrtime(stime);
    console.log(`total time: ${(stopt[0] * 1e9 + stopt[1])/1e9} seconds`.cyan);
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
<th >Date</th>
<th >Title</th>
<th >Tags</th>
<th style="border-radius: 0 5px 0 0;">org</th>
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

function blog_attr(...attr) {
    if(attr[6] == undefined ) attr[6]=''
    return `{
    "idblg" : "${attr[0]}",
    "title" : "${attr[1]}",
    "authr" : "${attr[2]}",
    "blink" : "${attr[3]}",
    "datep" : "${attr[4]}",
    "bfile" : "${attr[5]}",
    "bdesc" : "${attr[6]}"
}`;
}

function int3(num, size=3) {
    let s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function dateFormat (date, fstr, utc) {
  utc = utc ? 'getUTC' : 'get';
  return fstr.replace (/%[YmdHMS]/g, function (m) {
    switch (m) {
    case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
    case '%m': m = 1 + date[utc + 'Month'] (); break;
    case '%d': m = date[utc + 'Date'] (); break;
    case '%H': m = date[utc + 'Hours'] (); break;
    case '%M': m = date[utc + 'Minutes'] (); break;
    case '%S': m = date[utc + 'Seconds'] (); break;
    default: return m.slice (1); // unknown code, remove %
    }
    // add leading zero if required
    return ('0' + m).slice (-2);
  });
}

// --- start ---

const arg = process.argv.slice(2);

switch (arg[0]) {
    case '--save-urls':
        console.log('== save-urls ==');
        get_all_blog_url2array(urlroot);
        break;
    case '--check-new':
        console.log('== check-new ==');
        CHCKNEW = true;
        get_all_blog_url2array(urlroot, true);
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
