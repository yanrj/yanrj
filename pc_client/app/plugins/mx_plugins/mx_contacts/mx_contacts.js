var MXContacts = function(){
    var mxContacts = {};

    /**
     * 获取通讯录人员及部门数据
     */
    mxContacts.selectUser = function(callback){
        var btnConv = location.href;
        MXJquery('.main-wrap', parent.document).attr('type','3');
        MXJquery('.btn-new-conv', parent.document).click();
        var getDataTimer = setInterval(function(){
            var iframeData = MXJquery('#iframeData');
            if(iframeData.length > 0){
                var datajson = iframeData.html();
                if(datajson != ''){
                    datajson = eval('(' + datajson + ')');
                    callback(datajson);
                    clearInterval(getDataTimer);
                }else{
                    clearInterval(getDataTimer);
                }
            }
        }, 300)
    }
    /**
     * 获取通讯录人员及部门数据
     */
    mxContacts.selectUsers = function(callback){
        var btnConv = location.href;
        MXJquery('.main-wrap', parent.document).attr('type','3');
        MXJquery('.btn-new-conv', parent.document).click();
        var getDataTimer = setInterval(function(){
            if(parent.window.iframeData){
                var datajson = parent.window.iframeData;
                if(datajson != 'channel'){
                    datajson = eval('(' + datajson + ')');
                    callback(datajson);
                    clearInterval(getDataTimer);
                }else{
                    clearInterval(getDataTimer);
                }
                parent.window.iframeData = null;
            }
        }, 300)
    }

    return mxContacts;
}();