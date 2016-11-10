var MXWebui = function(){
    var mxWebui = {};

    /**
     * 关闭当前窗口
     */
    mxWebui.closeWindow = function(){
       // //MXJquery('.slide-iframe').empty();
       // MXJquery("#slideWindow").animate({right: '-380px'}, 300,function(){
       //      MXJquery('.slide-iframe').empty();
       //  });
       MXCommon.slideWindow.hide();
    }
    return mxWebui;
}();