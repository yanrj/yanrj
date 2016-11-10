/*
 * 本地存储服务
 */
angular.module('mx.services.storage', [])
    .factory('Storage', ['$localStorage', '$sessionStorage', function($localStorage, $sessionStorage) {
        var ls = $localStorage;
        var ss = $sessionStorage;
        var storage = {};

        /*
         * 存token对象
         * @param tokenObj: 完整的token对象，其属性如下
         * token对象属性：access_token, default_network_id, refresh_token, expires_in, token_type
         */
        storage.setToken = function(tokenObj) {
            ls.mxWebClientApp_token = JSON.stringify(tokenObj);
            //console.log('setToken success!');
        };

        /*
         * 取token对象,如果传递指定属性，则返回相应属性，无参数则返回token对象
         * @param attr: 需要获取的token对象的属性，属性key见"setToken"
         */
        storage.getToken = function(attr) {
            if (!ls.mxWebClientApp_token) { return {}; }

            var token = JSON.parse(ls.mxWebClientApp_token);

            return attr ? token[attr] : token;
        };


        /*
         * 删除token对象,如果传递指定属性，则删除token对象相应属性，无参数则删除token对象
         * @param attr: 需要删除的token对象的属性，属性key见"setToken"
         * TODO: 增加删除属性逻辑
         */
        storage.removeToken = function(attr) {
            delete ls.mxWebClientApp_token;
        };

        /*
         * 存储当前用户的信息到storage
         * @param key[String]: 要设置的信息key
         * @param value[*]: 要设置的信息值
         */
        storage.setUser = function(key, value) {
            var user = ss.mxWebClientApp_user ? JSON.parse(ss.mxWebClientApp_user) : {};

            user[key] = value;
            ss.mxWebClientApp_user = JSON.stringify(user);
        };

        /*
         * 获取当前用户的所有数据
         * @param key[String]: 要获取的用户信息属性([currentUser|homeUser|id|name|networkId])
         */
        storage.getUser = function(key) {
            if (!ss.mxWebClientApp_user) return null;
            var user = JSON.parse(ss.mxWebClientApp_user);
            if (key) {
                return user[key];
            } else {
                return user;
            }
        };  

        /*
         * 删除storage中所有用户信息
         */
        storage.removeUser = function() {
            delete ss.mxWebClientApp_user;
        };

        /*
         * 删除所有storage信息
         */
        storage.removeAll = function() {
            delete ls.mxWebClientApp_token;
            // delete ss.mxWebClientApp_user;
        };

        //保存设置
        storage.saveSetting = function(name, value) {
            var setting = ls.mxWebClientApp_setting ? JSON.parse(ls.mxWebClientApp_setting) : {};

            setting[name] = value;
            ls.mxWebClientApp_setting = JSON.stringify(setting);
        };

        //获取设置
        storage.getSetting = function(name) {
            if (!ls.mxWebClientApp_setting) return null;

            var setting = JSON.parse(ls.mxWebClientApp_setting);

            if (name) {
                return setting[name];
            } else {
                return setting;
            }
        };

        /**
         * 存取曾经登陆过的用户名，不传参则返回用户名数组
         * [@param] username[String]: 需要保存的用户名
         */
        storage.userNameList = function(username) {
            var list = ls.mxWebClientApp_unameList ? JSON.parse(ls.mxWebClientApp_unameList) : [];

            if (username) {
                list = _.without(list, username);
                list.push(username);
                ls.mxWebClientApp_unameList = JSON.stringify(list);
            } else {
                return list;
            }
        };
        storage.getCurrentUser = function() {
                return storage.getUser("currentUser");
            }
        /**
         * 存取用户是否自动登录
         * [@param] auto[Boolean]: 是否别自动登录,不传参则返回布尔值
         */
        storage.autoLogin = function(isAuto) {
            var autoLogin = ls.mxWebClientApp_autoLogin || 'false';
            //console.info('autoLogin', autoLogin);
            if (typeof isAuto === 'boolean') {
                autoLogin = String(isAuto);
            } else {
                return autoLogin;
            }
        };
        /**
         *设置当前用户的最后一条消息
         */
        storage.setLatestMessageId = function(id, status) {
            var currentUser = this.getCurrentUser();
            if (!currentUser) return null;
            if(!_.isNumber(id)) return;
            if(status && status == 'offline')return ls["a_" + currentUser.account_id + "_offline_latest_msg_id"] = id;
            if(ls["a_" + currentUser.account_id + "_latest_msg_id"] > id) return;
            ls["a_" + currentUser.account_id + "_latest_msg_id"] = id;
        };
        /**
         *获取当前用户的最后一条消息
         */
        storage.getLatestMessageId = function(status) {
            var currentUser = this.getCurrentUser();
            if (!currentUser) return null;
            var accountId = currentUser.account_id;
            if(status && status == 'offline')return ls["a_" + accountId + "_offline_latest_msg_id"];
            return ls["a_" + accountId + "_latest_msg_id"];
        };
        /**
         * 存取当前用户，当前社区的未读数，不传参则返回为读书
         * [@param] totalUnreadNum[int]: 需要保存的未读数
         */
        storage.convsUnreadNum = function(totalUnreadNum) {
            storage.getUser("currentUser")
            if(!storage.getUser("currentUser")) return
            var storageKey = "u_" + storage.getUser("currentUser").id + "_unreadnum";
            if (_.isNumber(totalUnreadNum)) {
                ls[storageKey] = totalUnreadNum;
            }
            var unreadNumber= ls[storageKey];
            if(!unreadNumber){
                unreadNumber=0;
            }
            return unreadNumber;
        }
        /**
         * [hotKey description]
         * @param  {[name]} hotKey [热键名称]
         * @param  {[key]}  hotKey [绑定按键] 
         * @return {[key]}
         */
        storage.hotKey = function(name,key) {
            if(!storage.getUser("currentUser")) return '';
            
            var storageKey = "u_" + storage.getUser("currentUser").id + "_hotKey_" + name;
            if(key){
                ls[storageKey] = key;
            }else{
                key = ls[storageKey];
            }
            return key;
        }

        /**
         * 删除热键
         */
        storage.delHotKey = function(name) {
            var storageKey = "u_" + storage.getUser("currentUser").id + "_hotKey_" + name;
            delete ls[storageKey];
        }

        /**
         * 获取与存储 sidebar配置
         */
        storage.validModules = function(value) {
            var storageKey = "valid_modules";
            if(value){
                ls[storageKey] = value;
            }else{
                value = ls[storageKey];
            }
            return value;
        }

        /**
         * 获取与存储 sidebar配置(新)
         */
        storage.validNewModules = function(value) {
            var storageKey = "valid_new_modules";
            if(value){
                ls[storageKey] = value;
            }else{
                value = ls[storageKey];
            }
            return value;
        }

        /**
         *根据key存储缓存
         */
        storage.put = function(key, value) {
            ls[key] = value;
        };
        /**
         *根据key获取缓存
         */
        storage.get = function(key) {
            return ls[key]
        };
        return storage;
    }]);