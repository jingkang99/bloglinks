'use strict';

const os = require('os');
const fs = require('fs');
const tmp = require('tmp');
const util = require('util');
const path = require('path');
const colors = require("colors");
const crypto = require('crypto');
const hashmap = require('hashmap');
const cheerio = require("cheerio");
const  { execSync } = require('child_process');

//const axios = require("axios");

const argv = process.execArgv.join();
const isDebug = argv.includes('inspect');
const isVerbs = argv.includes('verbose');

const urlroot = 'https://www.armis.com/blog';
const REGULAR = ".resources__item .resource";
const FEATURE = ".MMM";

const IDXTITL = "h5";
const IDXAUTH = "h6";
const IDXLINK = "a";

const IDXDATE = ".MMM";
const BDYDATE = ".article__title h6";

const BODYBLG = ".article__content.richtext-entry";

const BDYTITL = ".article__title h1";
const DATAUTH = ".article__title h6";

const TITLEYN = true; // parse title in blog body

const ua_chrm = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

var ONEPAGE = false;
var CHCKNEW = false;

var blogcnt = 0;

if (! process.env.ARCROOT) {
    console.log('warning: export ARCROOT first, use ../blog_recd as default');
    process.env.ARCROOT = '../blog_recd';
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

var waitsec = (ms) => {
    const start = Date.now();
    let now = start;
    while (now - start < ms) {
      now = Date.now();
    }
}

function parse_blog_url($, section){
    const posts = $(section);
    let blogarr = [];

    for (let i = 0; i < posts.length; i++) {
        // blog title
		let postTitleWrapper = $(posts[i]).find(IDXTITL)[0],
            postTitle = $(postTitleWrapper).text();

		if(postTitle.length == 0){	// Featured
			postTitleWrapper = $(posts[i]).find(".h3.mt-4.leading-snug")[0];
            postTitle = $(postTitleWrapper).text();
		}

		postTitle = postTitle.replace(/\n/g, '');
		postTitle = postTitle.replace(/\"/g, '');
		postTitle = postTitle.trim();

        let title = postTitle.replace(/ /g, '_');
        title = title.replace(/[\W]+/g, '');

        if(title.length < 10) continue;

		// url link
		let postLink = $(posts[i]).attr("href");

		if(postLink === undefined){	// Featured
			let postLinkWrapper = $(posts[i]).find("a")[0];
            postLink = $(postLinkWrapper).attr("href");
		}

        if(! postLink.match('https') ) postLink = www[0] + postLink;
        postLink = postLink.replace(/\/\//g, '/');

        let author = 'Armis', postDate = 'January 5, 2000', postDesc=title;
        let authorWrapper = $(posts[i]).find(IDXAUTH)[0];
        if(authorWrapper != null ) author = $(authorWrapper).text();

		author = author.replace(/\s+By\s*/ig, '');
		author = author.trim();
		author = author.replace(/ $/, '');

        let dateWrapper = postDate = $(posts[i]).find(".font-mont.text-sm")[1];     
        postDate = $(dateWrapper).text().trim();
        
        if(! postDate.match(/\w+/) ) postDate = 'January 20, 2000',

        postDate = postDate.replace("th", '');
        postDate = postDate.replace("st", '');
        postDate = postDate.replace("nd", '');
        postDate = postDate.replace("rd", '');

        if(! postDate.match(',')){
            let datetemp = postDate.split(" ");
            postDate = datetemp[0] + ' ' + datetemp[1] + ', ' + datetemp[2];
        }

		let postDescWrapper = $(posts[i]).find(".line-clamp-3")[0];
		postDesc = $(postDescWrapper).text();
        postDesc = postDesc.replace(/[^a-zA-Z0-9 \.-]/g, '');

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
        //console.log(item_json); process.exit(1);
        blogarr.push(item_json);
    }

    return blogarr;
}

function find_blog_links(purl){
	// https://www.armis.com/blog/page/2/

    let num, mat = purl.match(/http[s]:\/\/.+page\/(\d+)/);
	mat == null ? num = 1 : num = mat[1];  

    let page = pagroot + '/p' + int3(num) + '.html'; 

    let firstp = false;
    if (purl.search(/\/1\//) > 0 ){
        purl = urlroot;  // blog root page with FEATUREed post
        firstp = true;
    }

    let html;
    if( ONEPAGE ) {
        if(CHCKNEW) {
            html = downloadf(purl);
            save_to_file(page, html);
        }
        else{
            console.log('reading from: ' + onepage);
            html = fs.readFileSync(onepage).toString();
        }
    }else{       
        if (fs.existsSync(page) && ! firstp ){   // always read the 1st page
            html = fs.readFileSync(page).toString();
        }else{
            html = downloadf(purl);

			if(html.length < 150000){
				waitsec(3000);
				html = downloadf(purl);
			}

            save_to_file(page, html);
        }
    }

    var $ = cheerio.load(html)

    // parse REGULAR posts
    var REGULAR_posts = parse_blog_url($, REGULAR);

    //if (firstp){    // parse FEATUREd posts in all pages
        var FEATURE_posts=[];
        FEATURE_posts = parse_blog_url($, FEATURE);
        //REGULAR_posts = [...FEATURE_posts, ...REGULAR_posts];
    //}

    //console.log("blog found: %d in page %d" , REGULAR_posts.length, int3(num[1]));
    return REGULAR_posts;
}

function save_to_file(file, content){
    try {
        if (fs.existsSync(file)) {
            return;
        }else{
            fs.writeFileSync(file, content, 'utf-8');
        }
    } catch(err) {
        console.log("err: ", file);
    }
}

function save_blog_content(url, file){   
    let stime = process.hrtime();

    let data = downloadf(url);
    if(data.length < 100) {
		console.log("  error req %s".red, url);
		return [null, null, null];
	}else if(data.match("Enable JavaScript and cookies to continue")){
		console.log(`\n   warning        try again     ${url}`.cyan);
		waitsec(5000)
		data = downloadf(url);
	}

    let jsdate, bdate;
    let reg = data.match(/datePublished":"(\d\d\d\d-\d\d-\d\d)T/);
    if( reg != null && reg.length > 0) jsdate = reg[1];

    var $ = cheerio.load(data);
	$("h3 a").remove();
	$(".relative.py-4").remove();

	data = $.html();
	let more1 = '<p><a href="/request-a-demo"><em><u>Request a demo</u></em></a><em> and see how Claroty can protect your organization.</em></p>';
	let more2 = 'Learn more about the platform by .&nbsp;';
	data = data.replace(more1, '');
	data = data.replace(more2, '<br>');
	$ = cheerio.load(data);

    let title = $("title").text().replace(' | Claroty', '-JK CTI');

    let bodyo = $(BODYBLG);
    let bodym = $(BODYBLG).html(); // locate blog main body

	if(bodym == null){
		console.log(data.green);
		save_to_file(os.tmpdir() + "/_resp.html", data);
		return [null, null, null];
	}

    // parse date and change file name, when post date not on index page   
    bdate = jsdate != null && jsdate.match(/\w+/) ? jsdate : find_post_date($, "MMM", ".MMM");
    if(file.match('2000-01-20') && bdate != null){
        file = file.replace('2000-01-20', bdate);
    }

	let btitl = $(BDYTITL);	// title date info

    // if title/topic not inclued in bodym
    let topic = $(BDYTITL).text().trim();
	let dateauth = $(DATAUTH).html(); // auth section

	if(dateauth != null ) {
		dateauth = dateauth.replace("by ", "");
		dateauth = dateauth.replace("|"  , "");
		dateauth = dateauth.replace(/\d+ min read/, "");
	}else{
		dateauth = "";
	}

    if( TITLEYN ) bodym = `<h1> ${topic} </h1><br>\n` + `\n${dateauth}<br><br>\n` + bodym;

    $ = cheerio.load(bodym); // only main part of blog

    // parse tags
    let taobj = $('.elementor-post-info__terms-list').find(".elementor-post-info__terms-list-item");
    let tatxt = [];
    for(let i=0; i < taobj.length; i++ ){
        tatxt[i] = $(taobj[i]).text();
    }
    let btags = tatxt.join(', ');

    const bhead_s =`<!DOCTYPE html>
<html lang="en-US">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="JK" content="SZ Threat Intel" />
<title>${title}</title>

<link rel='stylesheet' id='bootstrap4-css' href='../data/bootstrap.min.css'  type='text/css' media='all' />
<link rel='stylesheet' id='mediumish-style-css' href='../data/style.min.css' type='text/css' media='all' />

</head>
<body class="post-template-default single single-post single-format-standard">
<div class="container">
`;
    const bhead_e ='</div></body><br><br></html>';

    var gg = $('img')   // parse all images link and save to local
    for(let i=0; i < gg.length; i++ ){       
        let imgsrc = $(gg[i]).attr('src');
        let datsrc = $(gg[i]).attr('data-src');
        if(! imgsrc.match(/\w+/)) continue;
		if(! imgsrc.match(/\.(png|jpg)$/)) continue;

        let imgurl = imgsrc;
        if( imgurl.match(/data:image/) ) imgurl = datsrc;
        //console.log(imgurl);

        let fileimage = imgurl.split('/').slice(-1)[0].split('?')[0];
        let filelocal = datroot + '/' + fileimage;  // save to

        // use local downloadfed images
        bodym = bodym.replace(imgsrc, '../data/' + fileimage);

        if (fs.existsSync(filelocal)) continue;     // skip if already downloadfed

        if(! imgurl.match(/http/)) imgurl = www[0] + imgurl;       
        let encodedurl = encodeURI(imgurl);

		//figure img
		let fsrc = imgsrc;	//$('a figure img').attr('src');
		if( fsrc.match(/asset\/[a-zA-Z0-9_]{30,}/) ){
			try {
				//encodedurl = $('a figure').parent().attr('href');
				encodedurl = $(gg[i]).parent().parent().attr('href');

				fileimage = encodedurl.split('/').slice(-1)[0].split('?')[0];
				fileimage = crypto.createHash('md5').update(encodedurl, 'utf8').digest('hex').slice(0,16) + '.png';

				filelocal = datroot + '/' + fileimage;

				bodym = bodym.replace(encodedurl, '../data/' + fileimage);
				
				const matchResult = fsrc.match(/\/img\/asset\/([a-zA-Z0-9_]{30,})\//);
				const regex1 = 'src=".+' + matchResult[1] + '.+?"';
				var regexVar = new RegExp(regex1);
				bodym = bodym.replace(regexVar, 'src="../data/' + fileimage + '"');
				
				console.log(imgsrc+"\n");
			} catch (err) { 
				console.log("  warn: figure img");
			}	
		}

        try {
			if(! encodedurl.match(/\.(png|jpg)$/)) continue;

			downloadp(encodedurl, filelocal);	// for picture
			
			if(false){
				const response = axios({
					method: 'GET',
					url: encodedurl,
					responseType: 'stream',
				});

				const w = response.data.pipe(fs.createWriteStream(filelocal));            
				w.on('finish', () => {
					process.stdout.write(`.`);
				});				
			}
        } catch (err) { 
			console.log("  error: %s".red, encodedurl);
			continue;
        }
    }
    console.log("");

    // only keep the blog main body 
    bodym = bhead_s + "<br>" + bodym + bhead_e;

    save_to_file(file, bodym);

    let stopt = process.hrtime(stime);

	let ptime = lenfix(`${(stopt[0] * 1e9 + stopt[1])/1e9}`, 5) + 's' ;
    console.log("-- %s  %s  %s  %s  %s", lenfix(blogcnt, 3), lenfix(parseInt(bodym.length/1024)+'k', 7), lenfix(gg.length+'p', 4), ptime , url);

    return [btags, bdate, file.split('/').pop()];
}

function lenfix(str, width){
	if(String(str).length <= width) return String(str).padEnd(width);
	if(String(str).length >  width) return String(str).slice(0, width);
}

function find_post_date($, sec, selector){
    let dateWrap = $(selector)[0],
        postDate = $(dateWrap).text().trim();

    let reg = postDate.match(/(.+) at /);
    if( reg != null && reg.length > 0 ) postDate = reg[1];

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

function get_all_blog_url2array(urlp, firstpage_only=false, finalpage=0) {
    let stime = process.hrtime();
	let stimN = Date.now();

    !fs.existsSync(prjroot) && fs.mkdirSync(prjroot, { recursive: true });
    !fs.existsSync(pagroot) && fs.mkdirSync(pagroot);
    !fs.existsSync(datroot) && fs.mkdirSync(datroot);
    !fs.existsSync(blgroot) && fs.mkdirSync(blgroot);

    var loadhtml;
    if ( fs.existsSync(onepage) ){  // onepage is saved manually
        ONEPAGE = true;
        loadhtml = fs.readFileSync(onepage).toString();
    }else{
        loadhtml = downloadf(urlp);
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
    let arrfg = false;
    if (fs.existsSync(blogarry) && firstpage_only){
        console.log('read existing blog array');
        let buffe = fs.readFileSync(blogarry).toString();
        blogs = JSON.parse(buffe);
    }

    let bfilelist = fs.readdirSync(blgroot).join(' ');

    // find all posts in each blog page
    for(let i = 1; i <= lastpage; i++) {
        let page = urlroot + '/page/' + i +'/';
        if( ONEPAGE ) page = urlroot ;
		if( i == 1  ) page = urlroot ;

        let pburls = find_blog_links(page);

        if(firstpage_only){ // only check 1st page on new blog
            console.log("get %d blogs 1st page, %d", pburls.length, blogs.length);

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
			arrfg = true;
        }

        console.log('blogs in page %s %s %s', String(i).padEnd(3), String(blogs.length).padEnd(5), page);

		if(firstpage_only) break;
    }
	
    if(arrfg) // update blog info
        fs.writeFileSync(blogarry, JSON.stringify(blogs), function (err) { if (err) throw err; });

	let stopN = Date.now();
    let stopt = process.hrtime(stime);
    console.log(`\nblog array: ${stopN - stimN} seconds`.yellow);
}

function process_blog_cont2file( stopnum = 10000 ){
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
			
			if( ! obj.blink.match(bserver) ){ // blog outside
				console.log('ignore:'.yellow, obj.blink);
				continue;
			}

            let f = obj.idblg + '~' + obj.bdesc + '.html';
            if(bfilelist.match(f)){
                obj.btags = bhmap.get(obj.authr+' '+obj.bdesc).btags;
            }else{
				let bdate;

				if (fs.existsSync(ofile)) {
					console.log('   skip:'.yellow, obj.blink);
					console.log('       :'.yellow, ofile);

					[obj.btags, bdate, obj.bfile] = [[], obj.datep, obj.bfile + '.html'];
				}else{

					blogcnt = i + 1;
					[obj.btags, bdate, obj.bfile] = save_blog_content(obj.blink, ofile);

					if(obj.bfile == null){
						console.log('  error:'.yellow, obj.blink);
						continue;
					}
					if( ! bdate.match('2000-01-20') ){ //date found in blog
						obj.datep = bdate;
					}					
				}
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

            // create index table rows
            tablerow += `
<tr >
<td >${j}</td>
<td >${obj.datep}</td>
<td ><a href="blog/${obj.bfile}">${obj.title}</a></td>
<td >${bltgs}</a></td>
<td ><a href="${obj.blink}" target="_blank" class="extlk"></a></td>
</tr>`;
            j++;
            if( (i+1)%100 == 0 ){ console.log(); }

			let objfile = obj.bfile.replace(/\.html$/, '');
			blogs[i] = blog_attr(obj.idblg, obj.title, obj.authr, obj.blink, obj.datep, objfile, obj.bdesc);

        } catch(err) {
            console.log(i.yellow + blogs[i]);
            console.error(err)
        }
    }

    // create blogs.hash
    fs.writeFileSync(bloghash, JSON.stringify(bhmap), function (err) { if (err) throw err; });

    // update blog info
	fs.writeFileSync(blogarry, JSON.stringify(blogs), function (err) { if (err) throw err; });

    // create index.html
    let tt = blog_index();
    fs.writeFileSync(blgindex, tt[0] + tablerow + tt[1], function (err) { if (err) throw err; });

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

function downloadf(url){
    let html, tmpf = tmp.fileSync().name;
	try {
		let	output = execSync(`curl_chrome116  -s ${url} -o ${tmpf}`, { encoding: 'utf-8' });
		html = fs.readFileSync(tmpf).toString();
		
		if(html.length < 100) {
			output = execSync(`curl_safari15_5 -s ${url} -o ${tmpf}`, { encoding: 'utf-8' });
			html = fs.readFileSync(tmpf).toString();
		}
		return html;
	} catch (error) {
		console.error('err:', error.message);
	}
}

function downloadp(url, out){
	try {
		let	output = execSync(`curl_chrome116  -s ${url} -o ${out}`, { encoding: 'utf-8' });
		const stats = fs.statSync(out);

		if(stats.size < 1024) {
			output = execSync(`curl_safari15_5 -s ${url} -o ${out}`, { encoding: 'utf-8' });
		}
	} catch (error) {
		console.error('err:', error.message);
	}
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

function scan_blog_array(strsearch){
    if (! fs.existsSync(blogarry) || !fs.existsSync(bloghash))
        process.exit();

    let buffe = fs.readFileSync(blogarry).toString();
    let blogs = JSON.parse(buffe);
        buffe = fs.readFileSync(bloghash).toString();
    let bhmap = new hashmap(JSON.parse(buffe));
    let bkset = new Set();

    console.log("orginal: %s, indexed: %s\n".cyan, blogs.length, bhmap.size);

    let j = 0, regex = new RegExp(`${strsearch}`, 'i');

    for(var i = 0;  i < blogs.length; i++) {
        let obj = JSON.parse(blogs[i]);
        let key = obj.authr + ' ' + obj.bdesc; // hash key

        if(strsearch !=  null){
            if(obj.title.match(regex) ) 
                console.log('find: %s %s', String(i).padEnd(3), obj.blink.green), j++;
        }else{
            if(! bhmap.has(key)) console.log('miss: %s %s', String(i).padEnd(3), obj.blink.red);
            if(  bkset.has(key)) console.log('dupl: %s %s', String(i).padEnd(3), obj.blink.yellow);
        }
        bkset.add(key);
    }
    if(strsearch !=  null) console.log('find total', j);
}

// --- start ---
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
        get_all_blog_url2array(urlroot, false, 45);
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
    case '--scan':
        console.log('== check blog entry ==');

        let strsearch;
        if(arg.length > 1){
            strsearch = arg[1];
            console.log('search :', strsearch.yellow);

        }
        scan_blog_array(strsearch);
        break;
    case '--help':
    default:
        let ndjs = path.basename(__filename);
        console.log(`\nUsage:
node --inspect ${ndjs} --save-urls
node --inspect ${ndjs} --save-blog NUM
node --inspect ${ndjs} --check-new
node --inspect ${ndjs} --scan`);        
}
