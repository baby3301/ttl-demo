var urekamedia_libs = {
    getMSG: function(msg) {
        if (typeof msg != "undefined" && typeof msg == "object") {
            var tmp = "";
            for (field in msg) {
                for (i in msg[field]) {
                    tmp += msg[field][i] + "<br>";
                }
            }
            return tmp;
        }
        return msg;
    }
}