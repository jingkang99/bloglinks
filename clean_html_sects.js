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

let onepage = 'security-companies-in-Israel.html';
let cleanpg = 'security-companies-in-is-100.html';

let html = fs.readFileSync(onepage).toString();

var $ = cheerio.load(html);

$(".adace-slot-wrapper").remove();
$(".adace-slot").remove();

let tags = ['.adace-slot-wrappe', '.adace-slot'];
tags.forEach( e => { $(e).remove(); });

console.log("  clean " + tags );

save_to_file(cleanpg, $.html());

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

//process.exit(1);