var MXChat = function(){
    var mxChat = {};

    /**
     * 向用户发起聊天(暂时仅支持单人)
     */
    mxChat.chat = function(loginNamesArr,callback){
        var URL = MXScope.globalSetting.URL;
        var uri = '/api/v1/users/by_login_name?network_name='+MXScope.network.network_name+'&login_name='+loginNamesArr[0];
        var url = URL + uri;
        var type = "get";
        var params = '';

        MXEngine.ajax(url,type,params,function(data){
            var isMultiUser = loginNamesArr.length > 1;
            var data = {
                creator_id: MXScope.currentUser.id,
                type: isMultiUser ? 'new_conv' : 'user',
                network_id: MXScope.network.network_id,
                is_multi_user: isMultiUser ? true : false,
                id: [data.id],
                user_ids: {
                    count: loginNamesArr.length,
                    ids: loginNamesArr
                }
            }
            MXScope.h5ApiTrigger(data);
        });

        
    }

    return mxChat;
}();