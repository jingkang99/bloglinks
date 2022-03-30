// export ARCROOT='../arcroot'
// node --inspect get_logrocket_blog.js

'use strict';

const fs = require('fs');
const util = require('util');
const axios = require("axios");
const colors = require("colors");
const crypto = require('crypto');
const hashmap = require('hashmap');
const cheerio = require("cheerio");

const argv = process.execArgv.join();
const isDebug = argv.includes('inspect');
const isVerbs = argv.includes('verbose');

const urlroot = 'https://blog.logrocket.com/';
const REGular = ".recent-posts .grid-item";
const FEAture = ".featured-posts .card";

const ua_chrm = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36';

// create blog data folder
let ttt = urlroot.match(/http[s]:\/\/(.+)\//); 
let bserver = ttt[1];
const prjroot = process.env.ARCROOT + '/' + bserver;
const pagroot = process.env.ARCROOT + '/' + bserver + '/page';
const datroot = process.env.ARCROOT + '/' + bserver + '/data';
const blgroot = process.env.ARCROOT + '/' + bserver + '/blog';

const bloglist = prjroot + '/blogs.array';
const bloghash = prjroot + '/blogs.hash' ;
const blgindex = prjroot + '/index.html' ;

const config = {
	headers: { 'User-Agent': ua_chrm },
}

function parse_blog_url($, section){
	const posts = $(section);

    let blogarr = [];

    for (let i = 0; i < posts.length; i++) {

		let postID = $(posts[i]).attr("id");

		let postTitleWrapper = $(posts[i]).find(".card-title")[0],
			postTitle = $(postTitleWrapper).text();
        //let title = postTitle.replace(/[ |,|;|"|'|\?|<|>|\||\[|\]|\.|:|\(|\)|\{|\}|#|@|~|\!|\$\|\&]+/g, '_');
        let title = postTitle.replace(/[\W]+/g, '_');

		let authorWrapper = $(posts[i]).find(".post-name a")[0],
			author = $(authorWrapper).text();

		let postLinkWrapper = $(posts[i]).find(".card-title > a")[0],
			postLink = $(postLinkWrapper).attr("href");

		let postDateWrapper = $(posts[i]).find(".post-date")[0],
			postDate = $(postDateWrapper).text();

		let postDescWrapper = $(posts[i]).find(".card-text")[0],
			postDesc = $(postDescWrapper).text().replace(/[\n|\r|"]+/g, '');
        
        let blogFile = dateFormat (new Date(postDate), "%Y-%m-%d", true)
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
    if (fs.existsSync(page)){
        html = fs.readFileSync(page).toString();
    }else{
        let resp = await axios.get(purl);
        await save_to_file(page, resp.data);
        html = resp.data;
    }

	var $ = cheerio.load(html)

	// parse regular posts
	var regular_posts = parse_blog_url($, REGular);

    if (firstp){    // parse featured posts in first page        
        var feature_posts = parse_blog_url($, FEAture);

        //if(isDebug) console.log("featured blog:" + feature_posts.length);

        regular_posts = [...feature_posts, ...regular_posts];
    }

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

    let title = $("title").text().replace('- LogRocket Blog', '-JK CTI');
    let btags = $('.aretags').find('li').text().split('#').slice(1,);

    let bodym = $(".site-content .container").html();
    bodym = bodym.replaceAll('srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"', ' ');    

    $ = cheerio.load(bodym); // only blog main part

    const bhead_s =`<!DOCTYPE html>
<html lang="en-US">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="JK" content="SZ Threat Intel" />
<title>${title}</title>

<link rel='stylesheet' id='bootstrap4-css'  href='https://blog.logrocket.com/wp-content/themes/mediumish/assets/css/bootstrap.min.css' type='text/css' media='all' />
<link rel='stylesheet' id='mediumish-style-css'  href='https://blog.logrocket.com/wp-content/themes/mediumish/style.css?ver=5.9.2' type='text/css' media='all' />
<link rel="stylesheet" type="text/css" id="wp-custom-css" href="https://blog.logrocket.com/?custom-css=f9bf9daf84" />

</head>
<body class="post-template-default single single-post single-format-standard">
<div class="container">
`;
    const bhead_e ='</div></body></html>';

    let gg = $('img')   // parse all images src link and save to local
    for(let i=0; i < gg.length; i++ ){
        let imgurl = gg[i].attribs.src;
        // console.log(imgurl);
        
        if(! imgurl.match(/\w+/)) continue;

        let fileimage = imgurl.split('/').slice(-1)[0].split('?')[0];
        let filelocal = datroot + '/' + fileimage;  // save to

        gg[i].attribs.src = '../data/' + fileimage; // use local saved images in html
        bodym = bodym.replaceAll(imgurl, '../data/' + fileimage);

        if (fs.existsSync(filelocal)) continue;     // skip if already downloaded

        try {
            const response = await axios({
                method: 'GET',
                url: imgurl,
                responseType: 'stream',
            });
            
            const w = response.data.pipe(fs.createWriteStream(filelocal));            
            w.on('finish', () => {
                process.stdout.write(`.`);
            });
        } catch (err) { 
                throw new Error(err);
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

async function get_all_blog_url2array(urlp, firstpage_only=false) {
    let stime = process.hrtime();
    
    !fs.existsSync(prjroot) && fs.mkdirSync(prjroot);
    !fs.existsSync(pagroot) && fs.mkdirSync(pagroot);
    !fs.existsSync(datroot) && fs.mkdirSync(datroot);
    !fs.existsSync(blgroot) && fs.mkdirSync(blgroot);

    let resp = await axios.get(urlp, config);
	var $ = cheerio.load(resp.data)

    //get max page count
	const lastpage = $(".bottompagination .next > a").attr("href").match(/\d+/)[0];
	if(isDebug) console.log("\nlast page num:" + lastpage + "\n");

    // load existing blog urls
    var blogs = [];
    if (fs.existsSync(bloglist)){
        let buffe = fs.readFileSync(bloglist).toString();
        blogs = JSON.parse(buffe);
    }
    
    var bhmap;
    if (fs.existsSync(bloghash)){
        let buffe = fs.readFileSync(bloghash).toString();
        bhmap = new hashmap(JSON.parse(buffe));
    }else{
        bhmap = new hashmap();
    }

    // find all posts in each blog page
    for(let i = 1; i <= lastpage; i++) {
        let page = urlroot +'page/' + i + '/';

        let pburls = await find_blog_links(page);

        if(firstpage_only){ // unshift new blog
            console.log("get %d blogs 1st page, %d", pburls.length, blogs.length);

            pburls.forEach( e => {
                let o = JSON.parse(e);
                let f = blgroot + '/' + o.bfile + '.html';

                //if( ! bhmap.has(String(o.bfile)) ) {
                if(! fs.existsSync(f)){ 
                    blogs.unshift(e);   //add new
                    console.log("  add  %s".green, o.blink);
                }else{
                    console.log("  skip %s".grey, o.blink);
                }
            });
        }
        else{   // full from page 1 to last
            blogs = [...blogs, ...pburls];
        }
        
        // save blog array for debug
        fs.writeFile(bloglist, JSON.stringify(blogs), function (err) { if (err) throw err; });

        if(isDebug) console.log('blogs in page %d %d %s', i, blogs.length, page);

        if(firstpage_only) break;
        //if(i == 5) break;
    }
    
    let stopt = process.hrtime(stime);
    console.log(`\nblog array: ${(stopt[0] * 1e9 + stopt[1])/1e9} seconds`.yellow);
}

async function process_blog_cont2file( stopnum = 10000 ){
    let stime = process.hrtime();
    
    let buffe = fs.readFileSync(bloglist).toString();
    let blogs = JSON.parse(buffe);

    var bhmap;
    if (fs.existsSync(bloghash)){
        buffe = fs.readFileSync(bloghash).toString();
        bhmap = new hashmap(JSON.parse(buffe));
    }else{
        bhmap = new hashmap();
    }

    // save each individual blog
    let tablerow = '';
    for(let i = 0, j=1; i < blogs.length; i++) {
        if( i+1 > stopnum) break;

        try {
            let obj = JSON.parse(blogs[i]);

            let ofile = blgroot + '/' + obj.bfile + '.html';
            
            if (fs.existsSync(ofile)){  // if processed before, get the tags
                obj.btags = bhmap.get(obj.bfile).btags; 
            }else{
                obj.btags = await save_blog_content(obj.blink, ofile);
                obj.md5sm = crypto.createHash('md5').update(ofile, 'utf8').digest('hex').slice(0,16);               
            }

            bhmap.set(String(obj.bfile), obj);

            var bltgs = '';
            if(obj.btags.length > 0)
                String(obj.btags).split(',').forEach( e => {
                    bltgs += `<a class="btn btn-success">${e}</a>&nbsp;`;
                });
            
            let rr;
            if(rr = bltgs.match(/(.*)(&nbsp;)/)) bltgs = rr[1];

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
    if(isDebug) console.log("blog count: " + blogs.length);
    let stopt = process.hrtime(stime);
    console.log(`total time: ${(stopt[0] * 1e9 + stopt[1])/1e9} seconds`.cyan);
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
        console.log(`\nUsage:
node --inspect get_logrocket_blog.js --save-urls
node --inspect get_logrocket_blog.js --save-blog NUM
node --inspect get_logrocket_blog.js --check-new`);
        
}

// --- reference ---
// https://zetcode.com/javascript/axios/
// https://blog.logrocket.com/parsing-html-nodejs-cheerio/
// https://www.twilio.com/blog/2017/08/http-requests-in-node-js.html
// https://blog.abelotech.com/posts/calculate-checksum-hash-nodejs-javascript/

// 1. identify blog style: last page, load more ...
// 2. locate tags in index page to identify the blog elements: title, date, author ...
// 3. identify the blog elements in a single blog page: title, main body class ...

// get_all_blog_url2array -> find_blog_links(each page)  -> save_to_file & parse_blog_url

// process_blog_cont2file -> save_blog_content(save img) -> save_to_file

// https://www.npmjs.com/package/colors
// black red green yellow blue magenta cyan white gray grey


// --- index template ---
// https://dev.to/dcodeyt/creating-beautiful-html-tables-with-css-428l
// https://codepen.io/faaezahmd/pen/dJeRex

function blog_index(){
    let tt = [];
    
    tt[0] = `<style>
.styled-table {
    border-collapse: collapse;
    margin: auto;
    font-size: 0.9em;
    font-family: Segoe UI,Arial,sans-serif;
    min-width: 400px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
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
</style>

<table class="styled-table">
<caption>${bserver}</caption>
<thead>
<tr >
<th >seq</th>
<th >Date</th>
<th >Title</th>
<th >Tags</th>
<th >org</th>
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
</script>`;

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

// node --inspect get_logrocket_blog.js --save-urls
// node --inspect get_logrocket_blog.js --save-blog
// node --inspect get_logrocket_blog.js --check-new
