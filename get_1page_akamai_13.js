'use strict';

const fs      = require('fs');
const util    = require('util');
const path    = require('path');
const axios   = require("axios");
const colors  = require("colors");
const crypto  = require('crypto');
const hashmap = require('hashmap');
const cheerio = require("cheerio");
const execcmd = require('child_process').execFileSync;

const argv = process.argv.join();
const isDebug = argv.includes('inspect');
const isVerbs = argv.includes('verbose');

// -------------------------- UPDATE manually --------------------------

var urlroot = 'https://www.akamai.com/blog';
var prdroot = '';
var opnroot = '';
var sourceb = '';    // category - cti prd opn

const TITLEST = "Akamai Blog |";
const REGULAR = ".card.post";
const FEATURE = ".featured-post__content";
const PAGESTY = '';

var IDXTITL = "h6";
var IDXAUTH = ".post__author";

var IDXDATE = ".cmp-blog-author__info"; // blog sect -> data
var BDYDATE = ".cmp-blog-author__date";

var BDYBLOG = ".main-content__inner";
var DBYAUTH = '.MMM';
var BDYTAGS = ".cmp-tag-list__list-item--link";
var BDYTITL = ".MMM";

const ua_chrm = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36';

var ONEPAGE = false;
var CHCKNEW = false;
var FIRSTRN = false;

if (! process.env.ARCROOT) {
    console.log('warning: export ARCROOT first, use ../arcroot as default');
    process.env.ARCROOT = '../arcroot';
}

let www = urlroot.match(/http[s]:\/\/(.+?)\//);
let bserver = www[1].replace("www\.", '');
let rootfld = bserver;

if( argv.includes('--prd') ){  // a corp has more blog types
    urlroot = prdroot;
    sourceb = 'prd';
}
if( argv.includes('--opn') ){
    urlroot = opnroot;
    sourceb = 'opn';
}

if(sourceb.match(/\w+/)) rootfld = bserver + '-' + sourceb ;

console.log("  url root " + www[0].cyan);  // info
console.log("  domain   " + www[1].cyan);
console.log("  company  " + bserver.cyan);
console.log("  data dir " + rootfld.cyan);
if(sourceb.match(/\w+/)) console.log("  category " + sourceb.cyan);

const prjroot = process.env.ARCROOT + '/' + rootfld;
const pagroot = process.env.ARCROOT + '/' + rootfld + '/page';
const datroot = process.env.ARCROOT + '/' + rootfld + '/data';
const blgroot = process.env.ARCROOT + '/' + rootfld + '/blog';
const onepage = process.env.ARCROOT + '/' + rootfld + '/' + bserver + '.html';

const blogarry = prjroot + '/blogs.array';
const bloghash = prjroot + '/blogs.hash' ;
const blgindex = prjroot + '/index.html' ;
console.log("  one page " + onepage.cyan);

const config = {
    headers: { 'User-Agent': ua_chrm, 'accept': '*/*', 'referer': www[1] },
    timeout: 1000 * 2,
}

function parse_blog_url($, section){
    const posts = $(section);
    let blogarr = [];

    for (let i = 0; i < posts.length; i++) {
        let postTitleWrapper = $(posts[i]).find(IDXTITL)[0],
            postTitle = $(postTitleWrapper).text();
            postTitle = postTitle.replace(/\n/g, '').replace(/"/g, '\\"');
            postTitle = postTitle.trim();

        let title = postTitle.replace(/ /g, '_');
        title = title.replace(/[\W]+/g, '');
        title = title.replace(/_+/g, '_'); 
        title = title.replace(/…/g, ''); 

        if(title.length < 10) continue;

        let postLinkWrapper = $(posts[i]).find("a")[0],
            postLink = $(postLinkWrapper).attr("href");
            
        if(! postLink.match('https') ) postLink = www[0] + postLink;

        let author = bserver, postDate = 'January 5, 2000', postDesc = title;

        let authorWrapper = $(posts[i]).find(IDXAUTH)[0];
        if(authorWrapper != null ) 
            author = $(authorWrapper).text().replace(/By +/, '').replace(' |', '').replace('by ', '');
        author = author.trim();

        postDate = find_post_date($, posts[i], IDXDATE);
        if(urlroot.match('infusedinnovations')){
            let dd = $(posts[i]).find("meta")[1];
            postDate = $(dd).attr("content");
        }

        let postID = "post-" + crypto.createHash('md5').update(author+title, 'utf8').digest('hex').slice(0,6);

        let blogFile = dateFormat (new Date(postDate), "%Y-%m-%d", true);
        blogFile += '~' + postID + '~' + title;

        const item_json = blog_attr(postID, postTitle, author, postLink, postDate, blogFile, postDesc);
        //console.log(item_json); process.exit(1);
        blogarr.push(item_json);
    }
    return blogarr;
}

async function find_blog_links(purl){
    let pnum, num;

    if(purl.match(/viewsreference/) ){
        num = purl.match(/http[s]:\/\/.+\page=(\d+)/);
        pnum = num[1] + 1;
    }
    else if(purl.match('infusedinnovations') || purl.match('netmotionsoftware' )) {
        num  = purl.match(/http[s]:\/\/.+\/(\d+)/);
        pnum = num[1];
    }    
    else{
        num = purl.match(/http[s]:\/\/.+\/(\d+)\//);

        if( num == null){
            num  = purl.match(/http[s]:\/\/.+\/p(\d+)/);
            pnum = num[1];
        }else
            pnum = num[1];
    }

    let page = pagroot + '/p' + int3(pnum) + '.html'; 

    let firstp = false;
    if (purl.match( /(\/1$|\/1\/$)/ ) ){ // /blog/1/ or /blog/1
        purl = urlroot + '?page=1';
        firstp = true;
    }
    console.log(ONEPAGE, CHCKNEW, pnum, firstp, purl);

    var html;
    if( ONEPAGE ) {
        if(CHCKNEW) {
            if(bserver.match('akamai')){
                html = fs.readFileSync(pagroot + '/p001.html').toString();
                console.log('loading from: ' + pagroot + '/p001.html');
            }else{
                let resp = await axios_get(purl);
                await save_to_file(page, resp);
                html = resp;
            }
        }
        else{
            html = fs.readFileSync(onepage).toString();
            console.log('reading from: ' + onepage);
        }
        console.log('1 page bytes: ' + html.length);

    }else{       
        if (fs.existsSync(page) && ! firstp ){   // always read the 1st page
            html = fs.readFileSync(page).toString();
        }else{
            let resp = await axios_get(purl);
            //console.log('  get page: ' + purl + ' ' + resp.data.length);
            await save_to_file(page, resp);
            html = resp;
        }
    }

    var $ = cheerio.load(html)
    $(".nm-section-wrapper--dark.featured").remove();
    $(".wp-block-column").remove();
    $(".article-byline").remove();

    // parse REGULAR posts
    var REGULAR_posts = parse_blog_url($, REGULAR);

    if (firstp){    // parse FEATUREd posts in first page        
        var FEATURE_posts=[];
        FEATURE_posts = parse_blog_url($, FEATURE);
        REGULAR_posts = [...FEATURE_posts, ...REGULAR_posts];
    }

    console.log("blog found: %d\t%s", REGULAR_posts.length, purl);
    //console.log(REGULAR_posts); process.exit(0);
    return REGULAR_posts;
}

async function save_to_file(file, content){
    try {
        if (fs.existsSync(file)) {
            return;
        }else{
            await fs.writeFile(file, content, function (err) {if (err) throw err;});
        }
    } catch(err) {
        console.log("cannot save " + file);
        //console.error(err)
    }
}

async function save_blog_content(url, file){   
    let stime = process.hrtime();

    let data = await axios_get(url);
    if(data.length < 100) return [null, null, null];
    
    var $ = cheerio.load(data);
    
    let MANDI = false;
    let title = $("title").text(), titorg = title;
    if(title.includes(' | Mandiant')) MANDI= true;
    title = title.replace(TITLEST, '- JK CTI -');

    let urihp = www[1],  bodyt = BDYBLOG, 
        datas = IDXDATE, dataa = BDYDATE, tagaa = BDYTAGS;
    if(MANDI){  // blog has 2 domains and style
        urihp = 'mandiant.com';
        bodyt = ".resource";
        datas = '.minutes';
        dataa = ".time";
        tagaa = ".topic-hero div";
    }

    // parse tags
    let tagbb = $(tagaa), tagtt = [];
    for (let i = 0, j = 0; i < tagbb.length && j < 3; i++) {
        //console.log($(tagbb[i]).text());
        if( $(tagbb[i]).text().match(/(Company|News|Culture)/)) continue;
        tagtt.push( $(tagbb[i]).text().trim() );
        j++;
    }
    let btags = tagtt.join(',');

    btags = btags.replace(' < Back', '').replace('< ', '').replace(/ *Back */ig, '');
    if(btags.endsWith(',')) btags = btags.slice(0, -1); //remove last ,

    // parse date and change file name, when post date not on index page
    let bdate = find_post_date($, datas, dataa);

    if(file.match('2000-01-20') && bdate != null){
        file = file.replace('2000-01-20', bdate);
    }

    let uniq = file.split('~')[1];
    !fs.existsSync(datroot+'/'+uniq) && fs.mkdirSync(datroot+'/'+uniq);

    //remove unwanted div/class to keep layout clean   
    remove_html_sections($);

    let bodym = $(bodyt).html() // locate blog main body
    if(bodym == null) bodym = $('.simple').html(); // appgate
    
    let video = $('#video-70-30').html(); // video of appgate 
    video == null ? video = '' : process.stdout.write(`v`); 

    // if title/topic not inclued in bodym
    let topic = $(BDYTITL).text().trim();
    if(urlroot.match('appgate') ||
       urlroot.match('netmotionsoftware') ) 
       bodym = `<br><h1> ${topic} </h1><br>\n` + bodym;

    // no late load
    bodym = bodym.replaceAll(/Continue reading/g, '');
    bodym = bodym.replaceAll(/srcset=".*?"/g, ' ');
    bodym = bodym.replaceAll(/background-image:url\(.*?\);/g, ' ');

    $ = cheerio.load(bodym); // re-parse blog body

    const bhead_s =`<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="JK" content="SZ Threat Intel" />
<title>${title}</title>
<link rel='stylesheet' id='bootstrap4-css' href='../data/bootstrap.min.css'   type='text/css' media='all' />
<link rel='stylesheet' id='divi-plus-styles-css' href='../data/style.min.css' type='text/css' media='all' />
<style>.alignright { display: inline; float: right; margin-left: 1.5em;}</style>
</head><body class="post-template-default single single-post single-format-standard"><br><div class="container">
`;
    const bhead_e ='</div></body></html>';

    var gg = $('img')   // parse all image links and save to local
    for(let i=0; i < gg.length; i++ ){       
        let imgsrc = $(gg[i]).attr('src');
        let datsrc = $(gg[i]).attr('data-src');
        if( imgsrc == null || ! imgsrc.match(/\w+/)) continue;

        let imgurl = imgsrc;
        if( imgurl.match(/data:image/) ) imgurl = datsrc;
        if( imgurl == null) continue;

        // skip if already downloaded
        let imagename = imgurl.split('/').slice(-1)[0].split('?')[0];
        let filelocal = datroot + '/' + uniq + '/' + imagename; //save

        // handle special * in file name
        if(imagename.match(/[\*]/)) {
            filelocal = filelocal.replace('*', 'A');
            imagename = imagename.replace('*', 'A');
            process.stdout.write(`*`);
        }
        if(imagename.match(/%20/)) {
            filelocal = filelocal.replaceAll(/%20/g, 'B');
            imagename = imagename.replaceAll(/%20/g, 'B');
            process.stdout.write(`%`);
        }

        // use local downloaded images
        bodym = bodym.replaceAll(imgsrc, '../data/' + uniq + '/' + imagename);

        if(fs.existsSync(filelocal)) continue;

        if(! imgurl.match(/http/)) imgurl = 'https://' + urihp + imgurl;
        let encodedurl = imgurl;
        
        if(imgurl.includes('*')) encodedurl= encodeURI(imgurl); // handle special char

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
            try {
                process.stdout.write(`!`);
                execcmd('wget', [imgurl, '--connect-timeout=1 --tries=1','-q', '-O', filelocal], {stdio:'inherit'});
             } catch (err) {
                console.log(err.message);
             }
        }
    }
    console.log("");

    // only keep the blog main body, saved space
    bodym = bhead_s + video + bodym + bhead_e;
    await save_to_file(file, bodym);

    let stopt = process.hrtime(stime);

    console.log("-- %s  %s  %s  %s", String(parseInt(bodym.length/1024)+'k').padEnd(7), String(gg.length+'p').padEnd(4), `${(stopt[0] * 1e9 + stopt[1])/1e9}s`, url);

    return [btags, bdate, file.split('/').pop()];
}

// firstpage_only for blogs using "load more" style
async function get_all_blog_url2array(urlp, firstpage_only=false, finalpage=0) {
    let stime = process.hrtime();

    var loadhtml;
    if ( fs.existsSync(onepage) ){  // onepage html is saved manually for 1st parsing
        ONEPAGE = true;
        loadhtml = fs.readFileSync(onepage).toString();
    }else{
        let resp = await axios_get(urlp);
        loadhtml = resp;
    }

    var $ = cheerio.load(loadhtml);

    var lastpage = 1;
    if( ! ONEPAGE ) {       // get max page #
        if(finalpage > 0)   // specified by user
            lastpage = finalpage;
        else
            lastpage = $(".bottompagination .next > a").attr("href").match(/\d+/)[0];       
        if(isDebug) console.log("\nlast page num:" + lastpage + "\n");
    }

    // load existing blog urls when checking new - add new to local array
    var blogs = [];
    var arrfg = false;
    if (fs.existsSync(blogarry) && firstpage_only && CHCKNEW){
        console.log('read existing blog array');
        let buffe = fs.readFileSync(blogarry).toString();
        blogs = JSON.parse(buffe);
    }
    if(blogs.length == 0) FIRSTRN = true; // blog array not created yet

    let bfilelist = fs.readdirSync(blgroot).join(' '); // check local blog existence

    // find all posts in each blog page
    for(let i = 1; i <= lastpage; i++) {
        let page = urlroot +'page/' + i + '/';
        if(PAGESTY.match(/\w+/)) page = urlroot +'/p' + i;
        
        if(urlroot.match('infusedinnovations')){
            page = urlroot +'/paged-2/' + i;
        }
        else if(urlroot.match('netmotionsoftware')){
            page = urlroot +'/page/' + i;
        }

        if( ONEPAGE ) page = urlroot + '/1/';

        let pburls = await find_blog_links(page);

        if(firstpage_only){ // only check new blogs on 1st page
            console.log("get %d blogs on 1st page, %d from local array", pburls.length, blogs.length);

            pburls.forEach( e => {
                let o = JSON.parse(e);
                let f = o.idblg + '~' + o.bdesc + '.html';

                if(! bfilelist.match(f)){
                    let action = 'push';
                    if(FIRSTRN){            // first time run
                        blogs.push(e);      // add new at end
                    }else{
                        blogs.unshift(e);   // add new at begin
                        action = 'unshift';
                    }
                    arrfg = true;           // array changed
                    console.log("  %s %s".green, action, f.slice(0, 100) );
                }else{
                    console.log("  skip %s".grey, o.blink);
                }
            });
        }
        else{   // full from page 1 to last
            blogs = [...blogs, ...pburls];
        }

        // save blog array for debug
        if(arrfg)
            fs.writeFile(blogarry, JSON.stringify(blogs), function (err) { if (err) throw err; });

        console.log('blogs in page %d %d %s', i, blogs.length, page);

        if(firstpage_only) break;
    }
    
    let stopt = process.hrtime(stime);
    console.log(`\nblog array: ${(stopt[0] * 1e9 + stopt[1])/1e9} seconds`.yellow);
}

async function process_blog_cont2file( stopnum = 10000 ){
    let stime = process.hrtime();
    
    if (! fs.existsSync(blogarry)){
        console.log("  error: blogs.array not found, save blog urls first");
        process.exit(1);
    } 
    
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
    let indexblg = new Set()

    for(var i = 0, j=1; i < blogs.length; i++) {
        if( i+1 > stopnum) break;

        try {
            let obj = JSON.parse(blogs[i]);
            let ofile = blgroot + '/' + obj.bfile + '.html';

            let f = obj.idblg + '~' + obj.bdesc + '.html';
            let k = obj.authr + ' ' + obj.bdesc; // hash key
    
            if( indexblg.has(k) ) continue;
            indexblg.add(k);    // add to index at least once

            if( obj.blink.match('traffic-super-bowl-') ||
                obj.blink.match('botnets-in-china-and-japan') ||
                obj.blink.match('strategy-for-the-office-anywhere')
               ) {
                console.log('ignor: ', obj.blink);
                continue;
            }

            if(bfilelist.match(f) ){    // blog file exists
                if( bhmap.get(k) != null ){
                    obj.btags = bhmap.get(k).btags;
                    obj.datep = bhmap.get(k).datep;
                    obj.bfile = bhmap.get(k).bfile;
                }
            }else{
                let bdate;
                [obj.btags, bdate, obj.bfile] = await save_blog_content(obj.blink, ofile);
                if(obj.bfile == null){
                    console.log('error: ', obj.blink);
                    continue;
                }
                if( ! bdate.match('2000-01-20') ){ //date found in blog
                    obj.datep = bdate;
                }
            }

            // add a uniq id 
            obj.md5sm = crypto.createHash('md5').update(obj.authr+obj.title, 'utf8').digest('hex').slice(0,16);

            bhmap.set(k, obj);

            var bltgs = '', c = 0;
            if(obj.btags != null && obj.btags.length > 0)
                String(obj.btags).split(',').forEach( e => {
                    if( ! e.includes('Attivo') && ! e.includes('Uncategorized') && c < 3)
                        bltgs += `<a class="btn btn-success">${e}</a>&nbsp;` , c++;
                });

            let rr;
            if(rr = bltgs.match(/(.*)(&nbsp;)/)) bltgs = rr[1];

            if( ! obj.bfile.endsWith('.html') ) obj.bfile = obj.bfile + '.html';
            
            let disp = obj.title.slice(0, 90);
            // create index table rows
            tablerow += `
<tr >
<td >${j}</td>
<td >${obj.datep}</td>
<td ><a href="blog/${obj.bfile}">${disp}</a></td>
<td >${bltgs}</a></td>
<td ><a href="${obj.blink}" target="_blank" class="extlk"></a></td>
</tr>`;
            j++;
            //process.stdout.write(`b`.grey);
            if( (i+1)%100 == 0 ){ console.log(); }
        } catch(err) {
            console.log(i+1, ' => ', blogs[i]);
            console.log(err.stack);
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
<caption>${rootfld} </caption>
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
       
function find_post_date($, sec, selector){
    let dateWrap = $(sec).find(selector)[0],      
        postDate = $(dateWrap).text().trim();

    if(! postDate.match(/\w+/) ) postDate = 'January 20, 2000',

    postDate = postDate.replace("th", '');
    postDate = postDate.replace("st", '');
    postDate = postDate.replace("nd", '');
    postDate = postDate.replace("rd", '');

    if(postDate.match(/^\d+ /)){  // change DD WWW YYYY 
        postDate = postDate.replace(/'/g, ' ');
        let datetemp = postDate.split(" ");
        postDate = datetemp[1] + ' ' + datetemp[0] + ', ' + datetemp[2];
    }

    if(! postDate.match(',')){  // if no ',' format to MM DD, YYYY
        let datetemp = postDate.split(" ");
        postDate = datetemp[0] + ' ' + datetemp[1] + ', ' + datetemp[2];
    }
    return dateFormat (new Date(postDate), "%Y-%m-%d", true);
}

function remove_html_sections($){   
    $(".blogtitle").remove();                   // banyan
    $(".blog-page__social-share").remove();     // netskope
    $(".blog-page__social-icons-inner").remove();
    
    $(".navigation.post-navigation").remove();  // attivonetworks
    $(".attivo-share-wrapper").remove();
    
    $(".par.prevnextbutton").remove();          // fireeye cti
    $(".block-bundle.block-bundle-featured_resources ").remove(); // mandiant
    $(".rank-math-breadcrumb").remove();        // infusedinnovations
    $(".newblog-social").remove();       // netmotionsoftware.com
    $(".addtoany_share_save_container").remove();
    $(".wp-block-latest-posts__list").remove();
    $(".wp-block-separator").remove();
    $(".post-grid.grid").remove();
    $(".article-byline").remove();  // instasafe
    $(".cmp-blog-author").remove(); // akamai
    $(".socialmedia").remove();
    $(".blogauthor").remove();
    $(".cmp-section").remove();
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

            execcmd('curl', ['--user-agent', ua_chrm, '-H', 'authority: www.akamai.com', '-s', '-o', tmpf, url], {stdio:'inherit'});
            html = fs.readFileSync(tmpf).toString();
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('error', error.message);
        }
    });
    return html != null ? html : resp.data;
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
// create blog data folder
!fs.existsSync(prjroot) && fs.mkdirSync(prjroot);
!fs.existsSync(pagroot) && fs.mkdirSync(pagroot);
!fs.existsSync(datroot) && fs.mkdirSync(datroot);
!fs.existsSync(blgroot) && fs.mkdirSync(blgroot);

let css = ['bootstrap.min.css', 'style.min.css'];
css.forEach( e => {
    if (fs.existsSync(datroot + '/' + e)) return;  
    fs.copyFile("node_modules/" + e, datroot + '/' + e,
        fs.constants.COPYFILE_EXCL, (err) => {
            if (err) { console.log("error found:", err); }
        }
    );
});

const arg = process.argv.slice(2);

switch (arg[0]) {
    case '--save-urls':
        console.log('== save-urls ==');
        get_all_blog_url2array(urlroot, true);
        break;
    case '--check-new':
        console.log('== check-new ==');
        CHCKNEW = true;
        get_all_blog_url2array(urlroot, true, 1);
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

// check-new not working, raw blog data embedded in data-prop-posts - json array, 
// using puppeteer to render the page 
// !! manually save the first complete page to page/p001.html, then run --check-new
/*
curl 'https://www.akamai.com/blog/security/attacks-anti-malware-dns-spoofing' \
  -H 'authority: www.akamai.com' \
  -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,* /*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
  -H 'accept-language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7' \
  -H 'cache-control: max-age=0' \
  -H 'downlink: 6.1' \
  -H 'dpr: 1' \
  -H 'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: document' \
  -H 'sec-fetch-mode: navigate' \
  -H 'sec-fetch-site: cross-site' \
  -H 'sec-fetch-user: ?1' \
  -H 'upgrade-insecure-requests: 1' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' \
  -H 'viewport-width: 1920' \
  --compressed
*/