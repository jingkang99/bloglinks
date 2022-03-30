# Blog Links - Knowledge Base Builder
## Collections of blogs in local for Cyber Threat Intelligence research

Keep your own copy of blogs, to extract IOC, analyze the threats and follow hot topics.

- only the main blog portion saved, no comments, extra links, etc...
- blog related files (html, css, js, pic) saved for offline reading
- index.html generated with each blog link
- tested on Windows and Linux

### Installation

```
git clone https://github.com/jingkang99/bloglinks
cd bloglinks

$ yarn
yarn install v1.22.10
info No lockfile found.
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
success Saved lockfile.
Done in 7.84s.
```

### Quick Start

```
# all blogs saved in this specified folder
export ARCROOT='../arcroot'

$ node get_logrocket_blog.js

Usage:
node --inspect get_logrocket_blog.js --save-urls
node --inspect get_logrocket_blog.js --save-blog NUM
node --inspect get_logrocket_blog.js --check-new
```

loop each blog index html page and save all blog urls to an array

> node --inspect get_logrocket_blog.js --save-urls

save all blogs in the array
  
> node --inspect get_logrocket_blog.js --save-blog

save the first 100 blogs in the array

> node --inspect get_logrocket_blog.js --save-blog 100

check if new blog published, and update the array
>  node --inspect get_logrocket_blog.js --check-new

### Modules

- axios
- colors
- crypto
- hashmap
- cheerio
