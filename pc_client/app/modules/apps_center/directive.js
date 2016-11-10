'use strict';
angular.module('mxWebClientApp')
/*
 * 应用中心容器
 */
.directive('appsCenterWrap', ['ContactBinder', 'AppCenterWrapBinder', '$injector', 'AppsServ', 'AppsCrumbs','Cache',
  function(ContactBinder, AppCenterWrapBinder, $injector, AppsServ, AppsCrumbs, Cache) {
    return {
      restrict: 'EA',
      template: '<div class="app-list-warp">\
      <return-app-btn ng-show="!installed"></return-app-btn>\
      <add-app-btn ng-show="installed"></add-app-btn>\
      <app-item ng-repeat="item in items"></app-item>\
                </div>\
                <div class="content-warp">\
                    <div app-info ng-show="showAppInfo" class="ocu-info"></div>\
                    <div class=iframe></div>\
                </div>',
      scope: true,
      controller: ['$scope', function($scope) {
        //绑定服务
        $injector.invoke(AppCenterWrapBinder.bind, this, {
          $scope: $scope
        });

        //标记当前应用界面是否是已安装应用
        $scope.installed = true;
        //标记是否显示应用列表容器
        $scope.showWrap = true;

        //作用域变量处理器
        $scope.scopeWorker = function(data) {
          $scope.items = data;
          $scope.installed = data.installed;
        };
        
        //获取已安装的apps
        AppsServ.query({uri_type:'added'},
          function(data) {
            //标记数据为已安装
            data.installed = true;

            AppCenterWrapBinder.init(data);

            //设置面包屑跟踪组件
            AppsCrumbs.init({
              data: data,
              name: '我的应用'
            });
          }, function(err) {
            console.error(err);
          });
      }]
    }
  }
])

/*
 * 添加公众号按钮
 */
.directive('addAppBtn', ['AppCenterWrapBinder', 'AppsServ', 'Crumbs', 'ContactBinder','SlideWindow',
  function(AppCenterWrapBinder, AppsServ, Crumbs, ContactBinder, SlideWindow) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div class="item" title="添加应用" data-id="{{id}}">\
              <span class="add-app-btn">+</span>\
              <span class="name">添加应用</span>\
            </div>',
      controller: ['$scope', function($scope) {
      }],
      link: function postLink(scope, ele, attrs) {
        //点击加载未订阅公众号
        ele.bind('click', function(e) {
          ContactBinder.loading(true);
          SlideWindow.hide();
          AppsServ.query({uri_type: 'to_be_added'},
          function(data) {
            //标记数据为未安装
            data.installed = false;
            AppCenterWrapBinder.init(data);
            Crumbs.add({
              name: '添加应用',
              data: data
            });

          }, function(err) {
            console.error(err);
            ContactBinder.loading(false);
          });

          $(".content-warp .iframe").empty();

        });
      }
    }
  }
])

/*
 * 返回已安装应用按钮
 */
.directive('returnAppBtn', ['AppCenterWrapBinder', 'AppsServ', 'Crumbs', 'ContactBinder','AppInfoBinder',
  function(AppCenterWrapBinder, AppsServ, Crumbs, ContactBinder, AppInfoBinder) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div class="item" title="返回已安装应用" data-id="{{id}}">\
              <span class="return-app-btn">←</span>\
              <span class="name">返回已安装应用</span>\
            </div>',
      controller: ['$scope', function($scope) {
      }],
      link: function postLink(scope, ele, attrs) {
        //点击加载订阅公众号
        ele.bind('click', function(e) {
          AppInfoBinder.hide();
          ContactBinder.loading(true);
          AppsServ.query({uri_type: 'added'},
          function(data) {
            //标记数据为已安装
            data.installed = true;
            AppCenterWrapBinder.init(data);
            //$('.hide .nav-crumbs .return').click();
          }, function(err) {
            console.error(err);
            ContactBinder.loading(false);
          });
        });
      }
    }
  }
])

/*
 * 应用中心item元素
 */
.directive('appItem', ['AppsServ', '$rootScope', 'Crumbs', 'AppCenterWrapBinder', 'AppInfoBinder',
  'TipsPopBinder', 'AppsCrumbs', 'ConversationBinder', '$http', 'GLOBAL_SETTING', 'WorkCircleListServ',
  'Storage','Cache','SlideWindow','FileDownload','Utils','PopMessage','RootscopeApply',
  function(AppsServ, $rootScope, Crumbs, AppCenterWrapBinder, AppInfoBinder, TipsPopBinder, AppsCrumbs,
    ConversationBinder, $http, GLOBAL_SETTING, WorkCircleListServ, Storage, Cache, SlideWindow, FileDownload,Utils,PopMessage, RootscopeApply) {
    return {
      restrict: 'EA',
      scope: true,
      template: '<div class="item" title="{{name}}">\
                  <div class="item-bg"></div>\
                  <div class="item-content">\
                    <img ng-src="{{uHead}}" data-type="{{type}}" alt="头像" />\
                    <span ng-show="notInstalled" class="unInstall"></span>\
                    <span class="new"></span>\
                    <span class="name">{{name}}</span>\
                    <a class="app-url" target="_blank" href="{{appUrl}}" ng-show="hasUrl && installed && h5plusin">打开应用</a>\
                    <span class="app-item-mask" data-appid="{{app_id}}"></span>\
                    <a ng-show="installed && !item.is_default_install" class="btn-uninstall" title="移除" href="#">移除</a>\
                  </div>\
                </div>',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        var item = $scope.data = $scope.item;
        var URL = GLOBAL_SETTING.URL;
        var matchUrl = item.url ? item.url.match(/^#(ocus\/)?.+/) : null;
        var ssoToken;
        var jumpUrl = item.pc_url ? item.pc_url : item.url;
        $scope.openOcu = false;
        $scope.openWorkCircle = false;
        $scope.app_id = item.app_id;
        $scope.name = item.name;
        $scope.uHead = URL + item.avatar_url;
        $scope.appUrl = URL + jumpUrl;
        $scope.h5plusin = item.type == 3 ? false : true;
        $scope.type = item.type;
          $scope.notInstalled = false;
        
        //服务器的插件应用的版本号
        $scope.server_version_code = item.version_code
        //服务器的插件应用的版本名称
        $scope.server_version_name = item.version
        //在cache文件夹中扫描是否有插件应用的文件夹，有的话代表已经安装，没有代表未安装
        if(item.is_default_install && item.type === 3){
          var fs = require('fs');
          //判断文件是否存在
          var folder_exists = fs.existsSync(Cache.get('rootDir') + 'app_center/' + $scope.app_id);
          if(folder_exists == false){
            $scope.notInstalled = true;
          }
        }
        if (matchUrl) {
          //如果匹配到url中的开头#，不显示跳转url的链接
          $scope.hasUrl = false;

          if (matchUrl[1]) {
            //如果匹配到'#ocus/',说明是公众号，可以跳转到对话
            $scope.openOcu = true;
          } else {
            //如果有#，但没匹配到#ocus/，说明是要跳转到工作圈的应用
            $scope.openWorkCircle = true;
          }
        } else {
          ssoToken = Storage.getToken().mx_sso_token;
          $scope.appUrl = $scope.appUrl + '&mx_sso_token=' + ssoToken;
          //url存在的话，设置可以跳转

          $scope.hasUrl = true;
        }
      }],
      link: function postLink(scope, ele, attrs) {
        //获取当前插件应用的版本号
        var getCurrentVersionCode = function(){
          //读取并解析plugin.properties文件
          var content = fs.readFileSync(Cache.get('rootDir') + 'app_center/' + scope.data.app_id  + '/plugin.properties', "utf-8");
            var regexjing = /\s*(#+)/;  //去除注释行的正则
            var regexkong = /\s*=\s*/;  //去除=号前后的空格的正则
            var obj = {};  //存储键值对

            var arr_case = null;
            var regexline = /.+/g;  //匹配换行符以外的所有字符的正则
            while(arr_case=regexline.exec(content)) {  //过滤掉空行
              if (!regexjing.test(arr_case)) {  //去除注释行
                obj[arr_case.toString().split(regexkong)[0]] = arr_case.toString().split(regexkong)[1];  //存储键值对
              }
            }
            //获取当前的版本号
            scope.current_version_code = Number(obj.version_code.substring(0,obj.version_code.length-1));
        }
        //如果没安装，显示未安装图标
        // console.info();
        // if(scope.notInstalled == true && scope.installed){
        //   ele.find('.unInstall').show();
        // }else{
        //   ele.find('.unInstall').hide();
        // }
        var fs = require('fs');
        //判断文件是否存在
        fs.exists(Cache.get('rootDir') + 'app_center/' + scope.data.app_id  + '/plugin.properties', function(exists) {
          if (exists == true) {
            getCurrentVersionCode();
            //将当前插件应用的版本号与服务器上面的进行比较，看是否要显示new图标，也就是有新版本
            if(scope.current_version_code && scope.current_version_code < scope.server_version_code && scope.installed){
              ele.find('.new').show();
            }else{
              ele.find('.new').hide();
            }
          }
        });
        var btnApp = ele.find('.app-item-mask');
        var btnUninstall = ele.find('a.btn-uninstall');
        var linkApp = ele.find('a.app-url');
        var rootDir = Cache.get('rootDir');
                console.info('下载路径：', rootDir);

        var install = function(current_version_code, server_version_code) {


          if(ele.find(".item-bg").hasClass('app-uploading')) {
            PopMessage.err({
                message: '该应用正在下载中，请耐心等待！'
            });
            return;
          }
          // $.magnificPopup.open({
          //   items: {
          //       src: '#pluginStatus',
          //       type: 'inline'
          //   },
          //   verticalFit: true,
          //   modal: true,
          //   callbacks: {
          //       close: function() {}
          //   }
          // });
          // //显示正在安装
          // $('#pluginLoading').show();
          $.magnificPopup.close();
          if(scope.data.type == 3 && scope.data.download_url){
            if(current_version_code < server_version_code || (!current_version_code && !current_version_code )){
              var fileUrl = GLOBAL_SETTING.URL + scope.data.download_url;
              var filePath = rootDir + 'app_center/';
              var fileName = scope.data.app_id+'.zip';
              ele.find('.item-content').removeClass('select');
              FileDownload.download(fileUrl, filePath, fileName,null,function(e){
                
                if(_.isNumber(e)){
                  ele.find(".item-bg").addClass('app-uploading');
                  ele.find(".item-bg").css('width',e+'%');
                }

                if(e == 'completed') {
                  RootscopeApply(scope, function() {
                    scope.notInstalled = false;
                    scope.installed = true;
                    ele.find(".item-bg").removeClass('app-uploading');
                  });
                  //隐藏未安装和new图标
                  ele.find('.new').hide();
                  if($('.confirm').hasClass('will-install')){
                    $('.confirm').removeClass('will-install');
                  }
                }
              });
            }
          }
        };
        var uninstall = function() {
          AppsServ.remove({uri_type:'added', id:scope.app_id},
            function(data) {
              scope.installed = false;
              //卸载完成，删除应用图标
              ele.remove();
              //删除app_center中的应用目录
              var fs = require('fs');
              var path = rootDir + 'app_center/' + scope.app_id;
              var deleteFolder = function(path){
                var files = [];
                if( fs.existsSync(path) ) {
                    files = fs.readdirSync(path);
                    files.forEach(function(file,index){
                        var curPath = path + "/" + file;
                        if(fs.statSync(curPath).isDirectory()) { // recurse
                            deleteFolder(curPath);
                        } else { // delete file
                            fs.unlinkSync(curPath);
                        }
                    });
                    fs.rmdirSync(path);
                }
              }
              deleteFolder(path);

              //更新面包屑数据
              AppsCrumbs.update('installed', scope.data);
            }, function() {});
        };

        //请求公众号信息，并打开对应的对话
        var openOcuConv = function() {
          $http({
            url: GLOBAL_SETTING.URL + '/api/v1/ocus/by_ocu_id/' + scope.app_id,
            method: 'GET'
          }).success(function(data) {
            ConversationBinder.trigger(data);
          }).error(function(err) {
            delay.reject(err);
          });
        };

        //提交app打开的统计请求
        var appStatistics = function() {
          $http({
            url: GLOBAL_SETTING.URL + '/api/v1/analysis?eid=1&tid=' + scope.app_id,
            method: 'GET'
          });
        }

        btnApp.bind('click', function(e) {
          e.preventDefault();
          $('.confirm').addClass('will-install');
          var type = ele.find('img').data('type');
          var appId = $(this).data('appid');
          var fs = require('fs');
          var licens = Storage.validNewModules();
          ele.find(".item-bg").css('width','0%');
          //判断该插件是否被授权
          if(licens.apps[appId] == false){
            PopMessage.tip({
              msg: '产品License不支持此功能或此功能已过期，请联系管理员。',
              type: 0
            });
            return;
          }

          $(".app-list-warp .item-content").removeClass('select');
          $(this).parent().addClass('select');

          if (scope.installed && scope.openOcu) {
            //如果是已安装应用而且是ocu,打开ocu对应对话
            openOcuConv();
          } 

          if (scope.installed && scope.openWorkCircle) {
            //如果是#开头但不是#ocus/的应用，则跳转到工作圈
            WorkCircleListServ.openFromNoti(scope.item.url);
          }
          if(scope.notInstalled == true){

            TipsPopBinder.show({
              body: '是否确定安装应用"' + scope.name + '"?',
              showCancel: true,
              showConfirm: false,
              showConfirm1: true,
              confirmed: function() {
                install();
              }
            });
            // console.log('scs',$('.will-install'))
            // $('.will-install').bind('click', function(){
            //   $.magnificPopup.open({
            //     items: {
            //         src: '#pluginStatus',
            //         type: 'inline'
            //     },
            //     verticalFit: true,
            //     modal: true,
            //     callbacks: {
            //         close: function() {}
            //     }
            //   });
            //   alert(1111)
            //   //显示正在安装
            //   $('#pluginLoading').show();
            // });
            return;
          }

          var isVersion = true;
          if(scope.installed && type == 3){
            var isNative = fs.existsSync(rootDir + 'app_center/' + appId + '/www/index.html');
            if(!isNative) {
              $(".content-warp").addClass('no-data').find(".iframe").html('<p class="no-data" ng-show="!items.length">该应用不适合在PC端使用</p>');
              return;
            }

            getCurrentVersionCode();
            if(scope.current_version_code < scope.server_version_code){
              isVersion = false;
              TipsPopBinder.show({
                body: '发现新版本' + scope.server_version_name,
                showConfirm: false,
                showEnter: true,
                showUpdate: true,
                confirmed: function() {
                  isVersion = true;
                  enterPlugin();
                  //install();
                },
                canceled: function() {
                  install(scope.current_version_code, scope.server_version_code);
                }
              });
              // $('.update').bind('click', function(){
              //   $.magnificPopup.open({
              //     items: {
              //         src: '#pluginStatus',
              //         type: 'inline'
              //     },
              //     verticalFit: true,
              //     modal: true,
              //     callbacks: {
              //         close: function() {}
              //     }
              //   });
              // });
            }
            
          }

          function UrlRegEx(url)   
          {      
            var re = /(\w+):\/\/([^\:|\/]+)(\:\d*)?(.*\/)([^#|\?|\n]+)?(#.*)?(\?.*)?/i;   
            var arr = url.match(re);   
            return arr;   
          }  
          var enterPlugin = function(){
            //判断是插件应用或者是web应用的情况
            if((scope.installed && type == 3 || scope.installed && type == 2) && isVersion){
              //获取APP在本地存储地址
              switch(type) {
                case 3:
                  var src = 'file://' + rootDir + 'app_center/' + appId + '/www/index.html';
                  break;
                case 2:
                  var src = scope.appUrl;
                  //判断是否是白名单中的应用,非白名单应用外部打开
                  if(!Utils.isWhitelistHost(src)){
                    window.open(src,'_blank');
                    return;
                  }
                  break;
              }
              var params = {};
              params.id = 'appsIframe1';
              params.url = src;
              params.isShowTitle = false;
              params.titleName = scope.name;
              //SlideWindow.show(params);
              // //将APP插入iframe
              $(".content-warp .iframe").html('<iframe id="appsIframe" src="'+ src +'" width="100%" height="100%"></iframe>');
              $('.slide-iframe').css('margin-top','0px')
              //当iframe load 之后，将JS插件注入
              $(window.frames["appsIframe"]).load(function(){
                var idocument = $('#appsIframe').prop('contentDocument');
                var head = UrlRegEx(window.location.href)[1];
                var el = idocument.createElement('script');
                el.setAttribute("type","text/javascript");
                el.setAttribute("src",head+'://'+window.location.host+"/plugins/mx_plugins/mx_plugins_engine.js");
                idocument.body.appendChild(el);
              });
            }
          }

          enterPlugin();
          if (!scope.installed) {
            //如果是未安装应用
            AppInfoBinder.show(scope.data);

            //将公众号信息添加到Crumbs中
            // Crumbs.add({
            //   name: scope.name,
            //   data: scope.data
            // });

            //隐藏应用中心列表容器
            //AppCenterWrapBinder.hide();
          } else {
            appStatistics();
          }
        });

        linkApp.bind('click', function(e) {
          appStatistics();
        });

        btnUninstall.bind('click', function(e) {
          e.preventDefault();
          var isSlideWindowShow = $(this).parent().hasClass('select');
          TipsPopBinder.show({
            body: '是否确定移除应用"' + scope.name + '"?',
            showCancel: true,
            showConfirm: true,
            confirmed: function() {
              if(isSlideWindowShow) SlideWindow.hide(); $('.iframe').hide();
              uninstall();
            }
          });
        });
      }
    }
}])

/*
 * app应用信息
 */
.directive('appInfo', ['GLOBAL_SETTING', 'AppsServ', 'AppInfoBinder', 'ConversationListBinder',
  '$location', 'TipsPopBinder', 'AppsCrumbs', 'ConversationBinder', 'CurUserDB', 'Cache', '$injector','FileDownload','Crumbs',
  function(GLOBAL_SETTING, AppsServ, AppInfoBinder, ConversationListBinder, $location, TipsPopBinder,
    AppsCrumbs, ConversationBinder, CurUserDB, Cache, $injector, FileDownload, Crumbs){
    return {
      restrict: 'EA',
      scope: true,
      template:   '<div class="head">\
                    <img ng-src="{{head}}" />\
                    <span>{{name}}</span>\
                  </div>\
                  <div class="feature">\
                    <h4>功能介绍</h4>\
                    <p>{{description}}</p>\
                  </div>\
                  <div class="btns">\
                    <a href="#" ng-show="!installed" class="btn-subscrib">添加应用</a>\
                    <a href="#" ng-show="installed" class="btn-unsubscrib">移除应用</a>\
                  </div>',
      controller: ['$scope', function($scope) {
        //绑定服务
        $injector.invoke(AppInfoBinder.bind, this, {
          $scope: $scope
        });

        var URL = GLOBAL_SETTING.URL;
        $scope.autoInstall = false;
        $scope.installed = false;
        $scope.URL = URL;

        $scope.scopeWorker = function(data) {
          $scope.head = URL + data.avatar_url;
          $scope.name = data.name;
          $scope.app_id = data.app_id;
          $scope.data = data;
          $scope.description = data.description || '暂无介绍';
          $scope.autoInstall = data.is_default_install;

          $scope.installed = false;
        };
      }],
      link: function postLink(scope, ele, attrs) {
        var btnInstall = ele.find('a.btn-subscrib');
        var btnUninstall = ele.find('a.btn-unsubscrib');

        var uninstall = function() {
          AppsServ.remove({uri_type:'added', id:scope.app_id},
            function(data) {
              scope.installed = false;

              //更新面包屑数据
              AppsCrumbs.update('installed', scope.data);
            }, function() {});
        };

        //安装
        btnInstall.bind('click', function(e) {
          e.preventDefault();
          AppsServ.save({uri_type:'added', app_id:scope.app_id},
            function(data) {

              scope.installed = true;
              if(scope.data.type == 3 && scope.data.download_url){
                var fileUrl = scope.URL + scope.data.download_url;
                var filePath = Cache.get('rootDir') + 'app_center/';
                var fileName = scope.data.app_id+'.zip';
                FileDownload.download(fileUrl, filePath, fileName);

              }

              //更新面包屑数据
              if ($location.path() !== '/main') {
                $(".app-list-warp .item.select").remove();
                AppsCrumbs.update('not_added', scope.data);
              }
            }, function() {});
        });

        //卸载应用
        btnUninstall.bind('click', function(e) {
          e.preventDefault();

          TipsPopBinder.show({
            body: '是否确定移除应用"' + scope.name + '"?',
            showCancel: true,
            showConfirm: true,
            confirmed: function() {
              uninstall();
            }
          });
        });

        // AppsServ.query({uri_type: 'to_be_added'},
        // function(data) {
        //   //标记数据为未安装
        //   data.installed = false;
        //   AppsCrumbs.init({
        //     name: '添加应用',
        //     data: data
        //   });

        // }, function(err) {
        //   console.error(err);
        //   ContactBinder.loading(false);
        // });
      }
    }
  }
])