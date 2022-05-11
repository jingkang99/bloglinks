# Blog Links - Knowledge Base Builder
## Collections of blogs in local for Cyber Threat Intelligence research

Keep your own copy of blogs, to extract IOC, analyze the threats and follow hot topics.

- only the main blog portion saved, no comments, extra links, etc...
- blog related files (html, css, js, pic) saved for offline reading
- index.html generated with each blog link
- tested on Windows and Linux

![image](https://user-images.githubusercontent.com/10793075/160975712-1b750720-2b38-4d76-bf02-eca5d0a69273.png)

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

### Corporates Followed
zero trust

| Corp   |    Script |
|----------| ------:|
| perimeter81  | get_1page_perimeter81.com_02.js |
| axissecurity | get_1page_axissecurity.js       |
| banyansecurity | get_1page_banyansecurity.io_04.js |
| twingate | get_1page_twingate.com.js |
| cyolo | get_npage_cyolo.io_03.js |
| appgate | get_npage_appgate.com_09.js |
| instasafe | get_1page_instasafe_12.js |
| attivonetworks | get_npage_attivonetworks.com_06.js |
| netmotionsoftware | get_npage_netmotionsoftware_11.js |
| infusedinnovat| get_npage_infusedinnovations_10.js |
| doubleoctopus | get_npage_doubleoctopus_15.js |
| delinea       | get_npage_delinea_16.js |
| gurucul       | get_1page_gurucul_17.js |
| securecircle  | get_1page_securecircle.com_20.js |

xdr

| Corp   |    Script |
|----------| ------:|
| mandiant  | get_npage_mandiant.com_08.js |
| corelight | get_1page_corelight_14.js |
| corelight | get_1page_corelight_14.js |
| corelight | get_1page_corelight_14.js |

sase

| Corp   |    Script |
|----------| ------:|
| akamai  | get_1page_akamai_13.js |
| netskope  | get_1page_netskope.com_05.js |


ess

| Corp   |    Script |
|----------| ------:|
| paloaltonetworks  | get_1page_paloaltonetworks_18.js |
| unit42            | get_1page_unit42.panetworks_19   |


gui dev

| Corp   |    Script |
|----------| ------:|
| logrocket  | get_logrocket_blog.js|

 no more update
- fireeye

![image](https://user-images.githubusercontent.com/10793075/165709471-3d394340-bdca-4858-9dd7-847f997a9e65.png)

![image](https://user-images.githubusercontent.com/10793075/166193818-43a97046-3d1c-4270-8e27-e8c308ef0e32.png)

