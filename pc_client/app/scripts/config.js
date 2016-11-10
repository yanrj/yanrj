'use strict';
var path = require('path'),
	absolutePath=path.resolve('./scripts');
var config = require(absolutePath+"/config.json"),
	modulesLayout=require(absolutePath+"/modules_layout.json");

config.modulesLayout=modulesLayout;
angular.module('mxWebClientApp').constant('GLOBAL_SETTING', config);
