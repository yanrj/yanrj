function getterSetter(variableParent, variableName, getterFunction, setterFunction) {
    if (Object.defineProperty) {
        Object.defineProperty(variableParent, variableName, {
            get: getterFunction,
            set: setterFunction
        });
    } else if (document.__defineGetter__) {
        variableParent.__defineGetter__(variableName, getterFunction);
        variableParent.__defineSetter__(variableName, setterFunction);
    }
}

(function(w) {
    var path = require('path'),
        absolutePath = path.resolve('./scripts'),
        config = require(absolutePath + "/config.json"),
        request = require('request');

    w.onlinejs = w.onlinejs || {};

    //Checks interval can be changed in runtime
    w.onLineCheckTimeout = 15000;

    //Use window.onLineURL incapsulated variable
    w.onlinejs._onLineURL = config.URL + "/logo.png";





    w.onlinejs.setOnLineURL = function(newURL) {
        w.onlinejs._onLineURL = newURL;
        w.onlinejs.getStatusFromNavigatorOnLine();
    }

    w.onlinejs.getOnLineURL = function() {
        return w.onlinejs._onLineURL;
    }

    getterSetter(w, 'onLineURL', w.onlinejs.getOnLineURL, w.onlinejs.setOnLineURL);


    //Verification logic
    w.onlinejs.setStatus = function(newStatus) {
        w.onlinejs.fireHandlerDependOnStatus(newStatus);
        w.onLine = newStatus;
    }

    w.onlinejs.fireHandlerDependOnStatus = function(newStatus) {
        if (newStatus === true && w.onLineHandler !== undefined && (w.onLine !== true || w.onlinejs.handlerFired === false)) {
            w.onLineHandler();
        }
        if (newStatus === false && w.offLineHandler !== undefined && (w.onLine !== false || w.onlinejs.handlerFired === false)) {
            w.offLineHandler();
        }
        w.onlinejs.handlerFired = true;
    };

    w.onlinejs.startCheck = function() {
        setInterval("window.onlinejs.logic.checkConnectionWithRequest()", w.onLineCheckTimeout);
    }

    w.onlinejs.stopCheck = function() {
        clearInterval("window.onlinejs.logic.checkConnectionWithRequest()", w.onLineCheckTimeout);
    }

    w.checkOnLine = function() {
        w.onlinejs.logic.checkConnectionWithRequest(false);
    }

    w.onlinejs.getOnLineCheckURL = function() {
        return w.onlinejs._onLineURL + '?' + Math.floor(Math.random() * 1000000);
    }

    w.onlinejs.getStatusFromNavigatorOnLine = function() {
        if (w.navigator.onLine !== undefined) {
            w.onlinejs.setStatus(w.navigator.onLine);
        } else {
            w.onlinejs.setStatus(true);
        }
    }

    var requestOptions = {
        headers: {
            'User-Agent': 'MinxingMessenger pc_client online'
        },
        method: 'HEAD'
    }
    w.onlinejs.logic = {
        init: function() {

        },
        checkConnectionWithRequest: function() {
            if (/\/login/.test(window.location)) return;
            requestOptions.url = w.onlinejs.getOnLineCheckURL();
            request(requestOptions, function(error, response, body) {
                if(!w.onlinejs) return;
                if (!error && response.statusCode == 200) {
                    w.onlinejs.setStatus(true);
                } else {
                    w.onlinejs.setStatus(false);
                }
            })

        }
    }





    //Events handling
    w.onlinejs.addEvent = function(obj, type, callback) {
        if (window.attachEvent) {
            obj.attachEvent('on' + type, callback);
        } else {
            obj.addEventListener(type, callback);
        }
    }

    w.onlinejs.addEvent(w, 'load', function() {
        w.onlinejs.fireHandlerDependOnStatus(w.onLine);
    });

    w.onlinejs.addEvent(w, 'online', function() {
        window.onlinejs.logic.checkConnectionWithRequest();
    })

    w.onlinejs.addEvent(w, 'offline', function() {
        window.onlinejs.logic.checkConnectionWithRequest();
    })

    w.onlinejs.getStatusFromNavigatorOnLine();
    w.onlinejs.logic.init();
    w.onlinejs.startCheck();
    w.onlinejs.handlerFired = false;
})(window);