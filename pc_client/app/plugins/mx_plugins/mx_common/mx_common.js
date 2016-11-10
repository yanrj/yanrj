var MXCommon = function(){
    var mxCommon={};
    var imgData = {};
    /**
     * 获取 SSOToken
     */
    mxCommon.getSSOToken = function(args,callback){
        var URL = MXScope.globalSetting.URL;
        var uri = '/api/v1/oauth/sso_token?app_id='+args;
        var url = URL + uri;
        var type = "post";
        var params = '';

        MXEngine.ajax(url,type,params,function(data){
            callback(data.sso_token);
        });
    }

    /**
     * 获取服务器地址
     */
    mxCommon.getServerUrl = function(callback){
        var URL = MXScope.globalSetting.URL;
        callback(URL);
    }

    /**
     * 获取当前用户数据
     */
    mxCommon.getCurrentUser = function(callback){
        var currentUser = MXScope.currentUser;
        //console.info('currentUser', currentUser);
        callback(currentUser);
    }

    /**
     * 从文件夹中选图接口
     */
    mxCommon.chooseImage = function(count,type,completeCallback,errorCallBack){
        //由于PC暂不支持拍照功能，所以type=album
        var type = ['album'];
        var element = MXJquery('body').append('<input type="file" accept="image/gif, image/jpeg, image/png" multiple="multiple" name="previewImg" id="previewImg" class="previewImg"/>');
        console.log('element:::', element)
        var elePreviewInput = element.find('.previewImg');
        var localIds = [];

        elePreviewInput.unbind('change');
        elePreviewInput.change(function(event) {
            previewImg();
            elePreviewInput.val('');
        });

        MXJquery('#previewImg').click();

        //图片预览方法
        var previewImg = function(){
            imgObj = elePreviewInput[0].files;
            console.info('elePreviewInput[0]', elePreviewInput[0]);
            var localIds = [];

            MXJquery.each(imgObj, function(index, val) {
                var newData = JSON.stringify(val);
                var newJson = eval('(' + newData + ')').path;
                localIds[index] = newJson;
                imgData[MXEngine.codeBase64.enCode(newJson)] = imgObj[index]
            });
            console.info('imgData', imgData);
            var data = {};
            data.localIds = localIds;
            data = JSON.stringify(data);
            completeCallback(data);
        }
    }
    /**
     * 从文件夹中选文件接口
     */
    mxCommon.chooseFile = function(count,type,completeCallback,errorCallBack){
        //由于PC暂不支持拍照功能，所以type=album
        var type = ['file'];
        var element = MXJquery('body').append('<input type="file"  multiple="multiple" name="previewImg" id="previewImg" />');
        var elePreviewInput = element.find('#previewImg');
        var localIds = [];

        elePreviewInput.unbind('change');
        elePreviewInput.change(function(event) {
            previewImg();
            elePreviewInput.val('');
        });

        MXJquery('#previewImg').click();

        //图片预览方法
        var previewImg = function(){
            imgObj = elePreviewInput[0].files;

            var _data = [];
            MXJquery.each(imgObj, function(index, val) {
                var newData = JSON.stringify(val);
                console.log('newData',newData)
                var newJsonPath = eval('(' + newData + ')').path;
                var newJsonName = eval('(' + newData + ')').name;
                var newJsonType = eval('(' + newData + ')').type;
                var contentType = newJsonType.slice(0, 5);
                // if(contentType != 'image'){
                //     newJsonPath = 'img/ico_file.png'
                // }
                var fileData = {};
                fileData.url = newJsonPath;
                fileData.name = newJsonName;
                fileData.contentType = newJsonType;
                //fileData.push(newJson);
                //fileData.push(eval('(' + newData + ')').name);
                _data.push(fileData);
                imgData[MXEngine.codeBase64.enCode(newJsonPath)] = imgObj[index];
            });
            var data = {};
            data = JSON.stringify(_data);
            completeCallback(data);
        }
    }


    /**
     * 上传图片
     */
    mxCommon.uploadImage = function(localIds,isloading,completeUploadCallback,errorUploadCallBack){
        mxCommon.upload(localIds,completeUploadCallback);
    }
    mxCommon.uploadFile = function(localIds,isloading,completeUploadCallback,errorUploadCallBack){
        mxCommon.upload(localIds,completeUploadCallback, errorUploadCallBack);
    }

    /**
     * 上传文件插件
     *
     * @param file[Object]: input-file value
     * @param name[String]: 文件名
     * @param type[String]: 文件类型
     * @param callback[fn]: 回调方法
     *
     * 现在只测试了上传图片，如上传其他格式文件需测试，未完待续ing...
     */
    //mxCommon.upload = function(file,name,type,callback){localIds
    mxCommon.upload = function(localIds,callback, errorUploadCallBack){
        //创建HTML5 FormData
        var fd = new FormData();
        fd.append("conversation_id", 0);
        for(var i = 0; i < localIds.length; i++){
            var file = imgData[MXEngine.codeBase64.enCode(localIds[i])];
            var newData = JSON.stringify(file);
            var newJson = eval('(' + newData + ')');
            fd.append('[uploading][]data; filename='+ newJson.name +' Content-Type: ' + newJson.type, file);
        }

        //上传文件
        MXJquery.ajax({
            url: MXScope.globalSetting.URL+"/api/v1/uploaded_files",
            type: "POST",
            headers:{
                'AUTHORIZATION':'bearer '+MXScope.getToken.access_token,
                'USER_AGENT':'MinxingMessenger pc_client'
            },
            processData: false,
            contentType: false,
            data: fd,
            success: function(e) {
                var data = [];
                for(var i = 0; i < e.length; i++){
                    var obj = {};
                    obj.serverId = e[i].id;
                    obj.fingerprint = e[i].fingerprint;
                    obj.contentType = e[i].content_type;
                    obj.name = e[i].name;
                    obj.size = e[i].size;
                    data[i] = obj;
                }

                var data = JSON.stringify(data);
                callback(data);
            },
            error: function(e){
                console.log('e::',JSON.parse(e.responseText).errors.message);
                errorUploadCallBack(JSON.parse(e.responseText).errors.message);
            }

        });
    }

    /**
     * pc端右侧滑动窗口
     * @param params[Object]
     *              .id: iframe id
     *              .url: 插入的地址
     *              .isShowTitle[bool]: 是否显示title
     *              .titleName[string] : 标题名称
     */
    mxCommon.slideWindow = function(){
        var o = {};
        var ele = MXJquery("#slideWindow");

        o.show = function(params){        //显示
            ele.show();
            if(ele.find('iframe').length > 0){
                ele.find('iframe').remove();
                ele.css('right',"-380px");
            }
            if(params.isShowTitle == false){
                MXJquery("#slideWindow .title").hide();
            }else{
                MXJquery("#slideWindow .title span").html(params.titleName);
            }
            //插入iframe
            ele.find('.slide-iframe').append('<iframe id="'+ params.id +'" src="'+ window.location.href+ params.url +'" width="100%" height="100%" frameborder=no></iframe>');

            function UrlRegEx(url)
              {
                var re = /(\w+):\/\/([^\:|\/]+)(\:\d*)?(.*\/)([^#|\?|\n]+)?(#.*)?(\?.*)?/i;
                var arr = url.match(re);
                return arr;
              }
            MXJquery(parent.window.frames[params.id]).load(function(){
              var idocument = MXJquery('#'+params.id).prop('contentDocument');
              var head = UrlRegEx(parent.window.location.href)[1];
              var el = idocument.createElement('script');
              el.setAttribute("type","text/javascript");
              el.setAttribute("src",head+'://'+ parent.window.location.host+"/plugins/mx_plugins/mx_plugins_engine.js");
              idocument.body.appendChild(el);
            });

            //写延时是因为执行动画的过程中 插入iframe 滑动会有卡顿现象，后续使用css3座滑动效果优化
            setTimeout(function(){
                ele.animate({right: 0}, 300);
            }, 300);

            //绑定关闭按钮
            ele.find('.close').on('click',function(){
                o.hide();
            });
        }
        o.hide = function(){        //隐藏
            ele.animate({right: '-380px'}, 300,function(){
                ele.find('.slide-iframe').empty();
                ele.hide();
            });

            ele.find('.close').off('click');
        }
        return o;
    }()

    /**
     * 获取服务器地址
     */
    mxCommon.download = function(url){
        window.location.href = url;
        //window.location.href = encodeURI(url);
    }

    return mxCommon;

}();