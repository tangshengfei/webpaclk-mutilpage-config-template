require("@style/home/style.less");
require("babel-polyfill");
;(async function(){
    var ret = await new Promise(function(resolve, reject) {
        setTimeout(() => {
            resolve("11")
        }, 3000);
    });
    console.log(ret);
})();

let [a, b, c, d] = [1, 2, 3, 4];