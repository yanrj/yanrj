var chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

function stringToHex(str) {　　　
  var val = "";　　　　
  for (var i = 0; i < str.length; i++) {
    var charNum = str.charCodeAt(i).toString(16);　　　　　　　
    val += charNum.length < 2 ? "0" + charNum : charNum;　　　　
  }　　　　
  return val;
}
/*产生随机数用的，用于密码加密，n表示需要生成多少位的随机数*/
function generateKey(n) {
  var res = "";
  for (var i = 0; i < n; i++) {
    var id = Math.ceil(Math.random() * 35);
    res += chars[id];
  }
  return res;
}
/*加密*/
function encrypt(data, key) {
  var md5Key = CryptoJS.MD5(CryptoJS.MD5(key).toString()).toString();
  key = CryptoJS.enc.Hex.parse(md5Key);
  var iv = CryptoJS.enc.Utf8.parse("a0fe7c7c98e09e8c");
  var str = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return stringToHex(atob(str));
}