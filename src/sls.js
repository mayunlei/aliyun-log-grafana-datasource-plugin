export class SLS{
    constructor(config,backendSrv,url)
    {
        this.config = config;
        this.backendSrv = backendSrv;
        this.url = url;
        this.hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase    */
        this.b64pad = ""; /* base-64 pad character. "=" for strict RFC compliance  */
        this.chrsz  = 8; /* bits per input character. 8 - ASCII; 16 - Unicode   */
    }
    requestData (mt, uri, hd, bd, fn, timeout) {
        var config = this.config;

        mt = mt.toUpperCase();

        bd = bd || {};
        hd['x-log-apiversion'] = config.api_version || '0.6.0';
        hd['x-log-bodyrawsize'] = '0';
        hd['x-log-signaturemethod'] = 'hmac-sha1';
        hd['x-sls-date'] = new Date().toGMTString();


        var sortStr = "GET\n\n\n"+hd['x-sls-date']+"\nx-log-apiversion:"+hd["x-log-apiversion"]+"\nx-log-bodyrawsize:0\nx-log-signaturemethod:hmac-sha1\n";
        sortStr += uri+"?"+this.getSortParamStr(bd);

        var signature = this.signFn(  sortStr);
        console.log(sortStr);
        console.log(signature);
        hd['Authorization'] = 'LOG ' + config.accessId + ":"+signature;

        var url = uri + '?' + this.getSortParamStr(bd, true) ;

        var vurl = this.url + url;
        var options = {  url : vurl,
                method:"GET",
                headers: hd
                };
        console.log("options",options);
        return this.backendSrv.datasourceRequest(options
                                );
    }
    GetData(ProjectName, logstore,opt, fn) {
        opt["type"] = "log";
        return this.requestData('GET', '/logstores/'+logstore+"/index", {}, opt, fn);
    }
    signFn(str)
    {
        return this.signStr(this.config.accessKey,str);
        //return this.b64_hmac_sha12(this.config.accessKey,str);
    }



    stringToUtf8ByteArray (str) {
        // TODO(user): Use native implementations if/when available
        var out = [], p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            } else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            } else if (
                ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
                ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };

    signStr(key,s)
    {
        var arr = this.stringToUtf8ByteArray(s);
        var res = "";
        arr.forEach(function(f){
            res += String.fromCharCode(f);
        });
        return this.b64_hmac_sha12(key,res);
    }
    b64_hmac_sha12(k,d,_p,_z){
        // heavily optimized and compressed version of http://pajhome.org.uk/crypt/md5/sha1.js
        // _p = b64pad, _z = character size; not used here but I left them available just in case
        if(!_p){_p='=';}if(!_z){_z=8;}function _f(t,b,c,d){if(t<20){return(b&c)|((~b)&d);}if(t<40){return b^c^d;}if(t<60){return(b&c)|(b&d)|(c&d);}return b^c^d;}function _k(t){return(t<20)?1518500249:(t<40)?1859775393:(t<60)?-1894007588:-899497514;}function _s(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}function _r(n,c){return(n<<c)|(n>>>(32-c));}function _c(x,l){x[l>>5]|=0x80<<(24-l%32);x[((l+64>>9)<<4)+15]=l;var w=[80],a=1732584193,b=-271733879,c=-1732584194,d=271733878,e=-1009589776;for(var i=0;i<x.length;i+=16){var o=a,p=b,q=c,r=d,s=e;for(var j=0;j<80;j++){if(j<16){w[j]=x[i+j];}else{w[j]=_r(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);}var t=_s(_s(_r(a,5),_f(j,b,c,d)),_s(_s(e,w[j]),_k(j)));e=d;d=c;c=_r(b,30);b=a;a=t;}a=_s(a,o);b=_s(b,p);c=_s(c,q);d=_s(d,r);e=_s(e,s);}return[a,b,c,d,e];}function _b(s){var b=[],m=(1<<_z)-1;for(var i=0;i<s.length*_z;i+=_z){b[i>>5]|=(s.charCodeAt(i/8)&m)<<(32-_z-i%32);}return b;}function _h(k,d){var b=_b(k);if(b.length>16){b=_c(b,k.length*_z);}var p=[16],o=[16];for(var i=0;i<16;i++){p[i]=b[i]^0x36363636;o[i]=b[i]^0x5C5C5C5C;}var h=_c(p.concat(_b(d)),512+d.length*_z);return _c(o.concat(h),512+160);}function _n(b){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s='';for(var i=0;i<b.length*4;i+=3){var r=(((b[i>>2]>>8*(3-i%4))&0xFF)<<16)|(((b[i+1>>2]>>8*(3-(i+1)%4))&0xFF)<<8)|((b[i+2>>2]>>8*(3-(i+2)%4))&0xFF);for(var j=0;j<4;j++){if(i*8+j*6>b.length*32){s+=_p;}else{s+=t.charAt((r>>6*(3-j))&0x3F);}}}return s;}function _x(k,d){return _n(_h(k,d));}return _x(k,d);
    }
    getSortParamStr (obj, flag) {
        var t = [];
        if (flag) {
            for (var k in obj) {
                if (k=='protobuf'|| obj.APIVersion >= '0.3.0' && k == 'Project')continue;
                t.push(k + '=' + encodeURIComponent(obj[k]));
            }
        }
        else {
            for (var k in obj) {
                if (k=='protobuf' || obj.APIVersion >= '0.3.0' && k == 'Project')continue;
                t.push(k + '=' + obj[k]);
            }
        }
        t.sort();
        return t.join('&');
    }
    getRealEndPoint (url, obj){

        //test
        //return {endpoint:  'http://service.sls-stg.aliyun-inc.com:179/', host: '44.sls-stg.aliyun-inc.com:179'};
        var hostname = url.replace("http://","");
        var v = url.replace("http://","");
        return {endpoint:"http://"+obj["Project"]+"."+v,host: hostname};
    };

}
